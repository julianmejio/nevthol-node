/**
 * Max coordinate in Tyria for X
 * @see [Tyria's continent coordinates]{@link https://wiki.guildwars2.com/wiki/API:Maps#Continent_coordinates}
 */
const MAP_TYRIA_MAX_X = 81920;

/**
 * Max coordinate in Tyria for Y
 * @see [Tyria's continent coordinates]{@link https://wiki.guildwars2.com/wiki/API:Maps#Continent_coordinates}
 */
const MAP_TYRIA_MAX_Y = 114688;

/**
 * Converts Tyria's coordinates to real-world LatLng coordinates. Especially needed for Redis' geospatial functions.
 * @see [GEOADD]{@link https://redis.io/docs/latest/commands/geoadd/}
 * @see [GEOSEARCH]{@link https://redis.io/docs/latest/commands/geosearch/}
 * @param {number} tyriaX Tyria's X coordinate, from 0 to {@link MAP_TYRIA_MAX_X}
 * @param {number} tyriaY Tyria's Y coordinate, from 0 to {@link MAP_TYRIA_MAX_Y}
 * @return {{number, number}} Tyria's X and Y converted to real-world's Longitude and Latitude respectively.
 * Intended to be used only by Redis Geospatial functions.
 */
const tyriaToLatLng = (tyriaX: number, tyriaY: number) => {
  // 1. Get the relation between X,Y and Lng,Lat respectively.
  const pctX = tyriaX / MAP_TYRIA_MAX_X;
  const pctY = tyriaY / MAP_TYRIA_MAX_Y;

  // 2. Map X to Longitude (-180 to 180) -> Span of 360
  const lng = -180 + pctX * 360;

  // 3. Map Y to Latitude (-80 to 80) -> Span of 160 (Safely inside 85 limit)
  const lat = -80 + pctY * 160;

  return { lat, lng };
};

/**
 * Converts real-world LatLng coordinates to Tyrias'. Especially to convert back coordinates given by {@link tyriaToLatLng}.
 * This is especially useful when converting raw stored coordinates coming from Redis' geospatial functions to Tyria's coordinates.
 * @see [GEOADD]{@link https://redis.io/docs/latest/commands/geoadd/}
 * @see [GEOSEARCH]{@link https://redis.io/docs/latest/commands/geosearch/}
 * @param {number} lat Real-world latitude coordinate, from -80 to 80.
 * @param {number} lng Real-world longitude coordinate, from -180 to 180.
 * @return {{number, number}} Real-world longitude and latitude converted to Tyria's X and Y respectively.
 * Intended to be used to convert from Redis geospatial store to application domain.
 */
const latLngToTyria = (lat: number, lng: number) => {
  const pctX = (lng + 180) / 360;
  const pctY = (lat + 80) / 160;

  const x = Math.round(pctX * MAP_TYRIA_MAX_X);
  const y = Math.round(pctY * MAP_TYRIA_MAX_Y);

  return { x, y };
};

/**
 * Packs the int X,Y coordinates into a binary Int32 buffer for storing and efficiency purposes. Use it to store coordinates.
 * @param coordinates
 * @param {number} coordinates.x Coordinate component X, ideally going from 0 to {@link MAP_TYRIA_MAX_X}
 * @param {number} coordinates.y Coordinate component Y, ideally going from 0 to {@link MAP_TYRIA_MAX_Y}
 * @return {Buffer} Packed binary buffer with the coordinates. Use {@link unpackCoordinates} to convert it back to x and y.
 */
const packCoordinates = ({ x, y }: { x: number; y: number }): Buffer => {
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(x, 0);
  buffer.writeUInt32BE(y, 4);
  return buffer;
};

/**
 * Unpacks binary coordinates to x and y.
 * @param {Buffer} buffer containing the coordinates in binary format, usually from the output of {@link packCoordinates}.
 * @return {{number, number}} the unpacked coordinates in x and y.
 */
const unpackCoordinates = (buffer: Buffer): { x: number; y: number } => {
  return {
    x: buffer.readUInt32BE(0),
    y: buffer.readUInt32BE(4),
  };
};

/**
 * Represents a point, associated with a grid size for grid calculations.
 */
interface GridPoint {
  /** X coordinate. */
  x: number;
  /** Y coordinate */
  y: number;
  /** Grid size where the point must be located */
  gridSize?: number;
}

/**
 * Radius where the viewport should be located
 */
interface ViewportRadiusCoordinates {
  radius: number;
}

/**
 * Checks if a point is inside a circle or not.
 * @param {number} circle_x Center of the circle in X.
 * @param {number} circle_y Center of the circle in Y.
 * @param {number} rad Radius of the circle
 * @param {number} x Point in X
 * @param {number} y Point in Y
 * @return `true` if the point is inside the circle, `false` otherwise.
 */
function isInside(
  circle_x: number,
  circle_y: number,
  rad: number,
  x: number,
  y: number,
) {
  // Compare radius of circle with
  // distance of its center from
  // given point

  if (
    (x - circle_x) * (x - circle_x) + (y - circle_y) * (y - circle_y) <=
    rad * rad
  )
    return true;
  else return false;
}

/**
 * Get the name of the grid room to locate the point.
 * @param param0
 * @param {number} param0.x Point in X
 * @param {number} param0.y Point in Y
 * @param {number} param0.gridSize Grid size
 * @return {string} Name of the room associated to the point.
 */
const getGridRoom = ({ x, y, gridSize = 100 }: GridPoint): string =>
  `${gridSize}_${Math.floor(x / gridSize)}_${Math.floor(y / gridSize)}`;

/**
 * Get the list of the rooms that are near to the point
 * @param param0
 * @param {number} param0.x Point in X
 * @param {number} param0.y Point in Y
 * @param {number} param0.gridSize Grid size
 * @param {number} param0.radius Radius size, where all the rooms in there will be listed.
 * @return {Set<string>} List of rooms near to the point of interest.
 */
const getNearestRooms = ({
  x,
  y,
  gridSize = 100,
  radius = 1000,
}: GridPoint & ViewportRadiusCoordinates): Set<string> => {
  const subscriptions = new Set<string>();
  const minX = x - radius;
  const minY = y - radius;
  const maxX = x + radius;
  const maxY = y + radius;
  const minRoomX = Math.floor(minX / gridSize);
  const minRoomY = Math.floor(minY / gridSize);
  const maxRoomX = Math.floor(maxX / gridSize);
  const maxRoomY = Math.floor(maxY / gridSize);
  const xGrid = Math.floor(x / gridSize);
  const yGrid = Math.floor(y / gridSize);
  const radGrid = Math.floor(radius / gridSize);
  for (let i = minRoomX; i <= maxRoomX; i++) {
    for (let j = minRoomY; j <= maxRoomY; j++) {
      if (isInside(xGrid, yGrid, radGrid, i, j)) {
        subscriptions.add(`${gridSize}_${i}_${j}`);
      }
    }
  }
  return subscriptions;
};

export {
  tyriaToLatLng,
  latLngToTyria,
  packCoordinates,
  unpackCoordinates,
  type GridPoint,
  type ViewportRadiusCoordinates,
  getGridRoom,
  getNearestRooms,
};
