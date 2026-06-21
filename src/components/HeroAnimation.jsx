import React, { useEffect, useRef } from 'react';

export default function HeroAnimation() {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const syncPlayback = () => {
      if (!video) return;

      if (motionQuery.matches) {
        video.pause();
        return;
      }

      video.play().catch(() => {
        // The poster remains visible if the browser blocks autoplay.
      });
    };

    syncPlayback();
    motionQuery.addEventListener('change', syncPlayback);

    return () => {
      motionQuery.removeEventListener('change', syncPlayback);
    };
  }, []);

  return (
    <figure className="overflow-hidden rounded-lg border border-ink/10 bg-paper shadow-soft">
      <video
        ref={videoRef}
        aria-hidden="true"
        autoPlay
        className="block aspect-video w-full bg-paper object-cover"
        loop
        muted
        playsInline
        poster="/assets/sblocco-hero-poster-v6.png"
        preload="auto"
      >
        <source src="/assets/sblocco-hero-loop-v6.mp4" type="video/mp4" />
        <source src="/assets/sblocco-hero-loop-v6.webm" type="video/webm" />
      </video>
    </figure>
  );
}
