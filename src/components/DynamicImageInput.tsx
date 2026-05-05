import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, X, Loader2, Check } from 'lucide-react';
import { supabaseSyncService } from '../services/supabaseSyncService';
import { toast } from 'sonner';

interface DynamicImageInputProps {
  value?: string;
  onChange: (url: string) => void;
  label: string;
  theme?: 'dark' | 'light';
  tableName: string;
}

export const DynamicImageInput: React.FC<DynamicImageInputProps> = ({
  value,
  onChange,
  label,
  theme = 'dark',
  tableName
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona una imagen válida');
      return;
    }

    // Validate file size (max 5MB for base64 overhead)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen es demasiado grande (máx 5MB)');
      return;
    }

    setIsUploading(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data:image/jpeg;base64, prefix
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      // Upload to Supabase Storage
      const photoPath = `dynamic/${tableName}/${label.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
      const result = await supabaseSyncService.uploadPhoto(base64, photoPath);

      if (result.success && result.fileUrl) {
        onChange(result.fileUrl);
        toast.success('Imagen subida correctamente');
      } else {
        throw new Error('Fallo al subir la imagen');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error al subir la imagen a la nube');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      {value ? (
        <div className="relative group aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/20">
          <img 
            src={value} 
            alt={label} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-all"
              title="Cambiar imagen"
            >
              <Camera className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={removeImage}
              className="p-2 bg-rose-500/80 hover:bg-rose-500 rounded-full text-white transition-all"
              title="Eliminar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="absolute bottom-2 right-2 bg-emerald-500 text-white p-1 rounded-full shadow-lg">
            <Check className="w-3 h-3" />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={`w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all ${
            theme === 'dark'
              ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-400 hover:text-white'
              : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-700'
          } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">Subiendo a Drive...</span>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Camera className="w-6 h-6" />
              </div>
              <div className="text-center">
                <span className="text-[10px] font-black uppercase tracking-widest block">Capturar Foto</span>
                <span className="text-[8px] opacity-50 uppercase tracking-widest">O selecciona un archivo</span>
              </div>
            </>
          )}
        </button>
      )}
    </div>
  );
};

