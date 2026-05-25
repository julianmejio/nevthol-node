export interface GridPoint {
  x: number;
  y: number;
  gridSize?: number;
}

export interface ViewportRadiusCoordinates {
  radius: number;
}

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

export const getGridRoom = ({ x, y, gridSize = 100 }: GridPoint): string =>
  `${gridSize}_${Math.floor(x / gridSize)}_${Math.floor(y / gridSize)}`;

export const getNearestRooms = ({
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
