// Keeps a short confidence trend per release so teams see if they are trending to GO.
export const MAX_POINTS = 30;

export function historyKey(projectKey, versionId) {
  return `trend:${projectKey}:${versionId}`;
}

export function appendPoint(points = [], point, max = MAX_POINTS) {
  const day = point.at.slice(0, 10);
  const rest = points.filter((p) => p.at.slice(0, 10) !== day); // one point per day, latest wins
  return [...rest, point].sort((a, b) => a.at.localeCompare(b.at)).slice(-max);
}

export function trendDelta(points = []) {
  if (points.length < 2) return null;
  return points[points.length - 1].score - points[points.length - 2].score;
}
