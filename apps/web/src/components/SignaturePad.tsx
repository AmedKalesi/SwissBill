import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface SignaturePadProps {
  /** İmza kaydedildiğinde çağrılır (PNG data URL + imzalayan adı). */
  onSubmit: (payload: { signatureData: string; signedByName: string }) => void;
  /** Kaydetme işlemi sürüyor mu */
  isSubmitting?: boolean;
  /** İptal edilebilir mi (modal içinde kullanılıyorsa) */
  onCancel?: () => void;
}

/**
 * Canvas tabanlı imza alanı.
 * Fare/dokunmatik ile çizim yapılır, PNG data URL olarak dışa aktarılır.
 */
export function SignaturePad({
  onSubmit,
  isSubmitting = false,
  onCancel,
}: SignaturePadProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signedByName, setSignedByName] = useState("");

  /** Canvas'ı yüksek DPI için ölçekler ve temizler. */
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  useEffect(() => {
    setupCanvas();
    const handleResize = () => {
      setupCanvas();
      setHasDrawn(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setupCanvas]);

  /** Pointer olayından canvas-relative koordinat üretir. */
  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    drawingRef.current = true;
    lastPointRef.current = getPoint(event);
    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    const last = lastPointRef.current;
    if (!ctx || !last) return;
    const point = getPoint(event);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
    if (!hasDrawn) setHasDrawn(true);
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
    lastPointRef.current = null;
  };

  const clear = () => {
    setupCanvas();
    setHasDrawn(false);
  };

  const handleSubmit = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn || !signedByName.trim()) return;
    onSubmit({
      signatureData: canvas.toDataURL("image/png"),
      signedByName: signedByName.trim(),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="signedByName"
          className="mb-1 block text-sm font-medium text-surface-700 dark:text-surface-200"
        >
          {t("signature.signedByName")}
        </label>
        <Input
          id="signedByName"
          name="signedByName"
          value={signedByName}
          onChange={(event) => setSignedByName(event.target.value)}
          placeholder={t("signature.signedByNamePlaceholder")}
        />
      </div>

      <div>
        <p className="mb-1 text-sm font-medium text-surface-700 dark:text-surface-200">
          {t("signature.drawHint")}
        </p>
        <canvas
          ref={canvasRef}
          className="h-40 w-full touch-none rounded-xl border border-surface-300 bg-white dark:border-surface-600"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={clear} disabled={isSubmitting}>
          {t("signature.clear")}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
        )}
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!hasDrawn || !signedByName.trim() || isSubmitting}
        >
          {isSubmitting ? t("common.saving") : t("signature.save")}
        </Button>
      </div>
    </div>
  );
}
