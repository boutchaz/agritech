import React from 'react';
import { Activity } from 'lucide-react';
import InteractiveIndexViewer from './InteractiveIndexViewer';

interface IndexImageViewerProps {
  parcelId: string;
  parcelName?: string;
  farmId?: string;
  boundary?: number[][];
}

const IndexImageViewer: React.FC<IndexImageViewerProps> = ({
  parcelId,
  parcelName,
  boundary
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Interactive Vegetation Analysis</h2>
        </div>
      </div>

      <p className="text-gray-600">
        {`Explore interactive satellite data with hover details, zoom, and pan capabilities for ${parcelName || `Parcel ${parcelId}`}`}
      </p>

      <InteractiveIndexViewer
        parcelId={parcelId}
        parcelName={parcelName}
        boundary={boundary}
      />
    </div>
  );
};

export default IndexImageViewer;
