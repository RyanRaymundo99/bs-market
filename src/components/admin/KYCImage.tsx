"use client";

import React, { useState, useEffect } from "react";
import { Loader2, ImageOff, ZoomIn } from "lucide-react";

interface KYCImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  onClick?: () => void;
}

export default function KYCImage({ src, alt, className = "", onClick }: KYCImageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!src) {
      setLoading(false);
      setError(true);
      return;
    }

    setLoading(true);
    setError(false);

    // Check if it's a blob URL, external URL, or local path
    let finalSrc = src;

    // Handle Vercel Blob URLs or external URLs
    if (src.startsWith("http://") || src.startsWith("https://")) {
      finalSrc = src;
    } else if (src.startsWith("/uploads/")) {
      // Local uploads
      finalSrc = src;
    } else if (src.startsWith("blob:")) {
      // Blob URLs (shouldn't happen from DB but handle it)
      finalSrc = src;
    }

    // Preload image
    const img = new Image();
    img.onload = () => {
      setImageSrc(finalSrc);
      setLoading(false);
      setError(false);
    };
    img.onerror = () => {
      setLoading(false);
      setError(true);
      console.error(`Failed to load image: ${finalSrc}`);
    };
    img.src = finalSrc;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  if (!src) {
    return (
      <div className={`bg-gray-700 rounded-lg border border-gray-600 flex items-center justify-center ${className}`}>
        <div className="text-center p-4">
          <ImageOff className="w-8 h-8 mx-auto text-gray-500 mb-2" />
          <p className="text-gray-400 text-sm">Nenhum documento enviado</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`bg-gray-700 rounded-lg border border-gray-600 flex items-center justify-center ${className}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto text-blue-400 animate-spin" />
          <p className="text-gray-400 text-sm mt-2">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-700 rounded-lg border border-red-600/50 flex items-center justify-center ${className}`}>
        <div className="text-center p-4">
          <ImageOff className="w-8 h-8 mx-auto text-red-400 mb-2" />
          <p className="text-red-400 text-sm">Erro ao carregar imagem</p>
          <p className="text-gray-500 text-xs mt-1 break-all max-w-[200px]">
            {src?.substring(0, 50)}...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative cursor-pointer group ${onClick ? "" : "cursor-default"}`}
      onClick={onClick}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc || ""}
        alt={alt}
        className={`object-cover rounded-lg border border-gray-600 group-hover:border-blue-500 transition-colors ${className}`}
        loading="lazy"
      />
      {onClick && (
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
          <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
    </div>
  );
}
