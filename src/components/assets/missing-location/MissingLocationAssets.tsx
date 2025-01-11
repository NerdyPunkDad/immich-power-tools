import "yet-another-react-lightbox/styles.css";
import { usePotentialAlbumContext } from "@/contexts/PotentialAlbumContext";
import { listPotentialAlbumsAssets } from "@/handlers/api/album.handler";
import { IAsset } from "@/types/asset";
import React, { useEffect, useMemo, useState, MouseEvent } from "react";
import { Gallery } from "react-grid-gallery";
import Lightbox from "yet-another-react-lightbox";
import Captions from "yet-another-react-lightbox/plugins/captions";
import {
  ArrowUpRight,
  CalendarArrowDown,
  CalendarArrowUp,
  Hourglass,
  Link,
} from "lucide-react";
import { useMissingLocationContext } from "@/contexts/MissingLocationContext";
import { listMissingLocationAssets } from "@/handlers/api/asset.handler";
import { formatDate, parseDate } from "@/helpers/date.helper";
import { addDays } from "date-fns";
import { useConfig } from "@/contexts/ConfigContext";
import LazyGridImage from "@/components/ui/lazy-grid-image";

interface IProps {
  groupBy: "date" | "album";
}
export default function MissingLocationAssets({ groupBy }: IProps) {
  const { exImmichUrl } = useConfig();

  const { startDate, albumId, selectedIds, assets, updateContext } =
    useMissingLocationContext();

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [index, setIndex] = useState(-1);
  const [lastSelectedIndex, setLastSelectedIndex] = useState(-1);

  const fetchAssets = async () => {
    if (!startDate && !albumId) return;
    setLoading(true);
    updateContext({
      assets: [],
    });
    const filters = groupBy === "date" ? { startDate } : { albumId }
    return listMissingLocationAssets(filters)
      .then((assets) => updateContext({ assets }))
      .catch(setErrorMessage)
      .finally(() => setLoading(false));
  };

  const images = useMemo(() => {
    return assets.map((p) => ({
      ...p,
      src: p.url as string,
      original: p.previewUrl as string,
      width: p.exifImageWidth as number,
      height: p.exifImageHeight as number,
      isSelected: selectedIds.includes(p.id),
      tags: [
        {
          title: "Immich Link",
          value: (
            <a href={exImmichUrl + "/photos/" + p.id} target="_blank">
              Open in Immich
            </a>
          ),
        },
      ],
    }));
  }, [assets, selectedIds]);

  const slides = useMemo(
    () =>
      images.map(({ original, width, height }) => ({
        src: original,
        width,
        height,
      })),
    [images]
  );

  const handleClick = (idx: number) => setIndex(idx);

  const handleSelect = (_idx: number, asset: IAsset, event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    const isPresent = selectedIds.includes(asset.id);
    if (isPresent) {
      updateContext({
        selectedIds: selectedIds.filter((id) => id !== asset.id),
      });
    } else {
      const clickedIndex = images.findIndex((image) => {
        return image.id === asset.id;
      });
      if (event.shiftKey) {
        const startIndex = Math.min(clickedIndex, lastSelectedIndex);
        const endIndex = Math.max(clickedIndex, lastSelectedIndex);
        const newSelectedIds = images.slice(startIndex, endIndex + 1).map((image) => image.id);
        const allSelectedIds = [...selectedIds, ...newSelectedIds];
        const uniqueSelectedIds = [...new Set(allSelectedIds)];
        updateContext({ selectedIds: uniqueSelectedIds });
      } else {
        updateContext({ selectedIds: [...selectedIds, asset.id] });
      }
      setLastSelectedIndex(clickedIndex);
    }
  };

  useEffect(() => {
    if (startDate || albumId) fetchAssets();
  }, [startDate, albumId]);

  if (loading)
    return (
      <div className="flex flex-col gap-2 h-full justify-center items-center w-full">
        <Hourglass />
        <p className="text-lg">Loading...</p>
      </div>
    );

  if (!startDate && !albumId)
    return (
      <div className="flex flex-col gap-2 h-full justify-center items-center w-full">
        <CalendarArrowUp />
        <p className="text-lg">Please select a date</p>
        <p className="text-sm">
          When you select a date from the left, you will see all the orphan
          assets captured on that date
        </p>
      </div>
    );

  return (
    <>
      <Lightbox
        slides={slides}
        plugins={[Captions]}
        open={index >= 0}
        index={index}
        close={() => setIndex(-1)}
      />
      <div className="w-full overflow-y-auto max-h-[calc(100vh-60px)]">
        <Gallery
          images={images}
          onClick={handleClick}
          enableImageSelection={true}
          onSelect={handleSelect}
          thumbnailImageComponent={LazyGridImage}
          tagStyle={{
            color: "white",
            fontSize: "12px",
            backgroundColor: "rgba(0, 0, 0)",
            padding: "2px",
            borderRadius: "5px",
          }}
        />
      </div>
    </>
  );
}
