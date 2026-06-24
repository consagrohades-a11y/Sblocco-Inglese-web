import React from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

const levels = ['A2', 'B1', 'B2'];

function PillButton({ active, children, count, onClick, dark = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`focus-ring inline-flex max-w-full min-w-0 items-center gap-2 whitespace-normal break-words rounded-full border px