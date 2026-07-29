import {Asset} from "expo-asset";

export type BinaryPOI = {
  id: number;
  name: string;
  lat: number;
  lon: number;
  alt: number;
};

export type IslandIndexEntry = {
  osm_id: number;
  name: string;
  file_pos: number;
  num_points: number;
  scale_factor: number;
  lat: number;
  lon: number;
  elevation: number;
  area: number;
  bounds: {
    min_x: number;
    max_x: number;
    min_y: number;
    max_y: number;
  };
  synthetic_id?: boolean;
};

export type BinaryIsland = {
  osmId: number;
  name: string;
  lat: number;
  lon: number;
  elevation: number;
  area: number;
  scaleFactor: number;
  points: Array<{x: number; y: number}>;
};

const textDecoder = new TextDecoder();

function requireBytes(
  view: DataView,
  offset: number,
  count: number,
  label: string,
): void {
  if (offset < 0 || count < 0 || offset + count > view.byteLength) {
    throw new RangeError(
      `${label} exceeds binary bounds: offset=${offset}, count=${count}, size=${view.byteLength}`,
    );
  }
}

export function decodePOIBinary(buffer: ArrayBuffer): BinaryPOI[] {
  const view = new DataView(buffer);
  requireBytes(view, 0, 12, "POI header");

  const magic = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3),
  );

  if (magic !== "POI1") {
    throw new Error(`Unsupported POI binary magic: ${magic}`);
  }

  const version = view.getUint16(4, true);
  if (version !== 1) {
    throw new Error(`Unsupported POI binary version: ${version}`);
  }

  const count = view.getUint32(8, true);
  const pois: BinaryPOI[] = [];
  let offset = 12;

  for (let index = 0; index < count; index += 1) {
    requireBytes(view, offset, 26, `POI ${index} fixed fields`);

    const id = view.getInt32(offset, true);
    offset += 4;

    const lat = view.getFloat64(offset, true);
    offset += 8;

    const lon = view.getFloat64(offset, true);
    offset += 8;

    const alt = view.getFloat32(offset, true);
    offset += 4;

    const nameLength = view.getUint16(offset, true);
    offset += 2;

    requireBytes(view, offset, nameLength, `POI ${index} name`);
    const name = textDecoder.decode(
      new Uint8Array(buffer, offset, nameLength),
    );
    offset += nameLength;

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      !Number.isFinite(alt)
    ) {
      throw new Error(`POI ${id} contains non-finite coordinates`);
    }

    pois.push({id, name, lat, lon, alt});
  }

  if (offset !== view.byteLength) {
    throw new Error(
      `Unexpected trailing POI bytes: parsed=${offset}, size=${view.byteLength}`,
    );
  }

  return pois;
}

export async function loadPOIsFromAsset(
  assetModule: number,
): Promise<BinaryPOI[]> {
  const asset = Asset.fromModule(assetModule);
  await asset.downloadAsync();

  if (!asset.localUri) {
    throw new Error("POI asset has no local URI");
  }

  const response = await fetch(asset.localUri);
  if (!response.ok) {
    throw new Error(`Unable to load POI asset: HTTP ${response.status}`);
  }

  return decodePOIBinary(await response.arrayBuffer());
}

export function decodeIslandAt(
  buffer: ArrayBuffer,
  entry: IslandIndexEntry,
): BinaryIsland {
  const view = new DataView(buffer);
  let offset = entry.file_pos;

  requireBytes(view, offset, 4, "island ID");
  const storedId = view.getUint32(offset, true);
  offset += 4;

  if (storedId !== entry.osm_id) {
    throw new Error(
      `Island index mismatch: expected ${entry.osm_id}, found ${storedId}`,
    );
  }

  requireBytes(view, offset, 2, "island name length");
  const nameLength = view.getUint16(offset, true);
  offset += 2;

  requireBytes(view, offset, nameLength, "island name");
  const name = textDecoder.decode(
    new Uint8Array(buffer, offset, nameLength),
  );
  offset += nameLength;

  requireBytes(view, offset, 32, "island fixed fields");

  const lat = view.getFloat64(offset, true);
  offset += 8;

  const lon = view.getFloat64(offset, true);
  offset += 8;

  const elevation = view.getFloat32(offset, true);
  offset += 4;

  const area = view.getFloat32(offset, true);
  offset += 4;

  const scaleFactor = view.getFloat32(offset, true);
  offset += 4;

  const numPoints = view.getUint32(offset, true);
  offset += 4;

  if (!Number.isFinite(scaleFactor) || scaleFactor <= 0) {
    throw new Error(`Island ${storedId} has invalid scale ${scaleFactor}`);
  }

  requireBytes(view, offset, numPoints * 8, "island points");

  const points: Array<{x: number; y: number}> = [];
  for (let index = 0; index < numPoints; index += 1) {
    const x = view.getInt32(offset, true) / scaleFactor;
    offset += 4;

    const y = view.getInt32(offset, true) / scaleFactor;
    offset += 4;

    points.push({x, y});
  }

  return {
    osmId: storedId,
    name,
    lat,
    lon,
    elevation,
    area,
    scaleFactor,
    points,
  };
}
