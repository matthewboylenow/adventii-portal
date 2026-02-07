'use client';

import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';

interface SignaturePadProps {
  onSave: (signatureData: string) => void;
  onClear?: () => void;
  disabled?: boolean;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function SignaturePad({ onSave, onClear, disabled, isSubmitting, submitLabel = 'Sign & Submit' }: SignaturePadProps) {
  const sigPadRef = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    sigPadRef.current?.clear();
    setIsEmpty(true);
    onClear?.();
  };

  const handleSave = () => {
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      const dataUrl = sigPadRef.current.getTrimmedCanvas().toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  const handleBegin = () => {
    setIsEmpty(false);
  };

  return (
    <div className="w-full">
      <div className={`border-2 rounded-lg bg-white overflow-hidden ${disabled ? 'border-gray-200 opacity-50' : 'border-gray-300'}`}>
        <SignatureCanvas
          ref={sigPadRef}
          canvasProps={{
            className: 'w-full h-48',
            style: { width: '100%', height: '192px', touchAction: 'none' },
          }}
          backgroundColor="white"
          penColor="#1A1A1A"
          onBegin={handleBegin}
        />
      </div>
      <p className="text-xs text-gray-500 mt-2 text-center">
        Sign above using your finger or stylus
      </p>
      <div className="flex gap-3 mt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleClear}
          disabled={disabled || isSubmitting}
        >
          Clear
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={isEmpty || disabled}
          isLoading={isSubmitting}
          className="flex-1"
          size="lg"
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
