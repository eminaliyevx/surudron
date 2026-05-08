import { createTileLayerComponent } from "@react-leaflet/core";
import L, { type Coords, type TileLayerOptions } from "leaflet";
import { cacheTile, getCachedTile } from "@/helpers/idbTileCacher";

interface OfflineFirstTileLayerProps extends TileLayerOptions {
  url: string;
}

class OfflineFirstTileLayer extends L.TileLayer {
  createTile(coords: Coords, done: L.DoneCallback): HTMLImageElement {
    const url = this.getTileUrl(coords);
    const img = document.createElement("img");

    img.onload = () => done(null, img);
    img.onerror = (event: Event | string) => {
      const error =
        event instanceof Error
          ? event
          : new Error(
              typeof event === "string" ? event : "Failed to load tile"
            );

      done(error, img);
    };

    (async () => {
      try {
        // 1. Try cache first
        let blob = await getCachedTile(url);
        if (blob) {
          img.src = URL.createObjectURL(blob);
          return;
        }

        // 2. Fetch from network
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Tile fetch failed: ${response.status}`);
        }

        blob = await response.blob();

        // 3. Cache it
        await cacheTile(url, blob);
        img.src = URL.createObjectURL(blob);
      } catch (err) {
        console.debug(`Tile unavailable (likely offline): ${url}`);
        done(err as Error, img);
      }
    })();

    return img;
  }
}

const CachedTileLayer = createTileLayerComponent<
  OfflineFirstTileLayer,
  OfflineFirstTileLayerProps
>(
  function create(props, context) {
    return {
      instance: new OfflineFirstTileLayer(props.url, { ...props }),
      context,
    };
  },
  function update(instance, props, prevProps) {
    if (props.url !== prevProps.url) {
      instance.setUrl(props.url, false);
    }
  }
);

export { CachedTileLayer };
