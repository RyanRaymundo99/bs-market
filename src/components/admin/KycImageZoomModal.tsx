"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, ImageOff, ExternalLink } from "lucide-react";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

interface KycImageZoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  alt: string;
  title: string;
}

export function KycImageZoomModal({
  open,
  onOpenChange,
  src,
  alt,
  title,
}: KycImageZoomModalProps) {
  const [zoom, setZoom] = useState(1);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!open) {
      setZoom(1);
      setLoadError(false);
    }
  }, [open]);

  useEffect(() => {
    setLoadError(false);
  }, [src]);

  const zoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
  const zoomOut = () => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP));
  const resetZoom = () => setZoom(1);

  const fullUrl = src.startsWith("/") ? `${typeof window !== "undefined" ? window.location.origin : ""}${src}` : src;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] p-0 bg-gray-900 border-gray-700 flex flex-col">
        <DialogHeader className="p-4 pb-0 flex flex-row items-center justify-between gap-4 border-b border-gray-700 shrink-0">
          <DialogTitle className="text-white text-xl">{title}</DialogTitle>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
              onClick={zoomOut}
              disabled={zoom <= MIN_ZOOM}
              title="Diminuir zoom"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-400 min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
              onClick={zoomIn}
              disabled={zoom >= MAX_ZOOM}
              title="Aumentar zoom"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
              onClick={resetZoom}
              title="Redefinir zoom"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 p-4 overflow-auto">
          {loadError ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] gap-4 text-center">
              <ImageOff className="w-12 h-12 text-gray-500" />
              <p className="text-gray-400">Não foi possível carregar a imagem.</p>
              {fullUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-gray-300"
                  onClick={() => window.open(fullUrl, "_blank")}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir em nova aba
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center min-w-full min-h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt}
                className="max-w-full h-auto object-contain rounded-lg border border-gray-600 select-none"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "center center",
                }}
                draggable={false}
                onError={() => setLoadError(true)}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
