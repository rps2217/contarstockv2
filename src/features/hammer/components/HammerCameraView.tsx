import React from 'react';
import { HammerItem } from '../hooks/useHammerLogic';
import { Product } from '../../../types';
import { FeedbackStatus } from '../../../hooks/useFeedbackSystem';
import { IndustrialScannerLayout } from '../../../shared/components/scanner/IndustrialScannerLayout';

interface HammerCameraViewProps {
 onBack: () => void;
 onScan: (code: string, qtyOverride?: number) => void;
 onRemove: (barcode: string) => void;
 onFinalize: () => void;
 onOpenTools: () => void;
 onLock?: () => void;
 location: string;
 onChangeLocation: () => void;
 activeBarcode: string | null;
 activeProduct: Product | null;
 feedback: FeedbackStatus;
 items: HammerItem[];
 isVoiceEnabled?: boolean;
 onSync?: () => void;
 isSyncing?: boolean;
 autoSyncEnabled?: boolean;
}

export const HammerCameraView: React.FC<HammerCameraViewProps> = ({
 onBack,
 onScan,
 onRemove,
 onFinalize,
 onOpenTools,
 onLock,
 location,
 onChangeLocation,
 activeBarcode,
 activeProduct,
 feedback,
 items,
 isVoiceEnabled = false,
 onSync,
 isSyncing = false,
 autoSyncEnabled = false
}) => {
 const activeItemName = activeProduct?.name || items.find(i => i.barcode === activeBarcode)?.name;

 return (
 <IndustrialScannerLayout
 onBack={onBack}
 onScan={onScan}
 onRemove={onRemove}
 onFinalize={onFinalize}
 onOpenTools={onOpenTools}
 onLock={onLock}
 location={location}
 onChangeLocation={onChangeLocation}
 activeBarcode={activeBarcode}
 activeItemName={activeItemName}
 feedback={feedback}
 items={items}
 isVoiceEnabled={isVoiceEnabled}
 allowEditQuantity={true}
 onSync={onSync}
 isSyncing={isSyncing}
 autoSyncEnabled={autoSyncEnabled}
 />
 );
};

