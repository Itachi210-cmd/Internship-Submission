import React from 'react';
import { BRAND_NAME } from '../constants/brand';

export default function BrandName({ className = '' }) {
  return <span className={className}>{BRAND_NAME}</span>;
}

export { BRAND_NAME };
