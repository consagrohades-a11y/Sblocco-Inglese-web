import React from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useState } from 'react';
import { reviews } from '../data/content';

export default function ReviewCarousel() {
  const [active, setActive] = useState(0);
  const review = reviews[active];

  const move = (direction) => {
    setActive((current) => (current + direction + reviews.length) % reviews.length);
  };

  return (
    <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex gap-1 text-coral" aria-label="Valutazione 5 stelle">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} aria-hidden="true" className="h-4 w-4 fill-current" />
            ))}
          </div>
          <p className="mt-4 text-lg font-black leading-7 text-ink">{review.name}</p>
          <p className="mt-1 text-sm font-bold text-moss">
            {review.role}
            {review.date ? <span className="text-ink/65"> · {review.date}</span> : null}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="focus-ring flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 text-ink transition hover:bg-mint"
            aria-label="Recensione precedente"
            onClick={() => move(-1)}
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="focus-ring flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 text-ink transition hover:bg-mint"
            aria-label="Recensione successiva"
            onClick={() => move(1)}
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="mt-5 text-base leading-7 text-ink/70">{review.text}</p>
      {review.image ? (
        <div className="mt-5 overflow-hidden rounded-lg border border-ink/10 bg-paper">
          <img src={review.image} alt={`${review.name} - screenshot recensione`} className="w-full" loading="lazy" />
        </div>
      ) : null}
      <div className="mt-6 flex gap-2">
        {reviews.map((item, index) => (
          <button
            type="button"
            key={item.image || item.name}
            onClick={() => setActive(index)}
            aria-label={`Mostra recensione ${index + 1}`}
            className={`h-2.5 rounded-full transition ${active === index ? 'w-8 bg-moss' : 'w-2.5 bg-ink/20'}`}
          />
        ))}
      </div>
    </div>
  );
}
