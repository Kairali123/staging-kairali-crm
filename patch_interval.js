const fs = require('fs');
['app/guest-experience/page.tsx', 'app/guest-experience-light/page.tsx'].forEach(file => {
  let c = fs.readFileSync(file, 'utf8');

  // Find nextSlide declaration and change it back to useCallback
  c = c.replace(
    /const nextSlide = \(\) => \{\n    setIsPlaying\(false\)\n    setCurrentSlideIndex\(\(prev\) => \(prev \+ 1\) % ACTIVE_SLIDES\.length\)\n  \}/,
    'const nextSlide = useCallback(() => {\n    setIsPlaying(false)\n    setCurrentSlideIndex((prev) => (prev + 1) % ACTIVE_SLIDES.length)\n  }, [ACTIVE_SLIDES.length])'
  );

  c = c.replace(
    /const prevSlide = \(\) => \{\n    setIsPlaying\(false\)\n    setCurrentSlideIndex\(\(prev\) => \(prev - 1 \+ ACTIVE_SLIDES\.length\) % ACTIVE_SLIDES\.length\)\n  \}/,
    'const prevSlide = useCallback(() => {\n    setIsPlaying(false)\n    setCurrentSlideIndex((prev) => (prev - 1 + ACTIVE_SLIDES.length) % ACTIVE_SLIDES.length)\n  }, [ACTIVE_SLIDES.length])'
  );

  fs.writeFileSync(file, c);
  console.log('Fixed ' + file);
});
