// Legacy path kept for existing imports — now backed by the UI kit.
import React from 'react';
import { LoadingRows } from './ui/States';

interface LoadingPlaceholderProps {
  rows?: number;
}

export const LoadingPlaceholder: React.FC<LoadingPlaceholderProps> = ({ rows = 3 }) => (
  <LoadingRows rows={rows} />
);

export default LoadingPlaceholder;
