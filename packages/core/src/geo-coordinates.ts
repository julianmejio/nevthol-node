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

export { tyriaToLatLng, latLngToTyria };
