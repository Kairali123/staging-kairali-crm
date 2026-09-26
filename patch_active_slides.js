const fs = require('fs');

['app/guest-experience/page.tsx', 'app/guest-experience-light/page.tsx'].forEach(file => {
  let c = fs.readFileSync(file, 'utf8');

  // Replace t and currentSlide
  const blockOld = `  const t = TRANSLATIONS[lang]
  const baseSlide = SLIDES[currentSlideIndex]
  const currentSlide = {
    ...baseSlide,
    title: kioskConfig?.slideOverrides?.[baseSlide.id]?.title || baseSlide.title,
    subtitle: kioskConfig?.slideOverrides?.[baseSlide.id]?.subtitle || baseSlide.subtitle,
  }`;
  
  const blockNew = `  const t = TRANSLATIONS[lang]
  const ACTIVE_SLIDES = SLIDES.filter(s => kioskConfig?.enabledSlides ? kioskConfig.enabledSlides.includes(s.id) : true)
  const baseSlide = ACTIVE_SLIDES[currentSlideIndex] || SLIDES[0]
  const currentSlide = {
    ...baseSlide,
    title: kioskConfig?.slideOverrides?.[baseSlide.id]?.title || baseSlide.title,
    subtitle: kioskConfig?.slideOverrides?.[baseSlide.id]?.subtitle || baseSlide.subtitle,
  }`;

  c = c.replace(blockOld, blockNew);

  // Replace SLIDES.length with ACTIVE_SLIDES.length in callbacks
  c = c.replace(
    /setCurrentSlideIndex\(\(prev\) => \(prev \+ 1\) % SLIDES\.length\)/g,
    'setCurrentSlideIndex((prev) => (prev + 1) % ACTIVE_SLIDES.length)'
  );
  
  c = c.replace(
    /setCurrentSlideIndex\(\(prev\) => \(prev - 1 \+ SLIDES\.length\) % SLIDES\.length\)/g,
    'setCurrentSlideIndex((prev) => (prev - 1 + ACTIVE_SLIDES.length) % ACTIVE_SLIDES.length)'
  );
  
  c = c.replace(
    /\{currentSlideIndex \+ 1\} \/ \{SLIDES\.length\}/g,
    '{currentSlideIndex + 1} / {ACTIVE_SLIDES.length}'
  );
  
  // Need to fix useCallback dependency for ACTIVE_SLIDES
  // nextSlide and prevSlide might need to use state or not be useCallback if they depend on ACTIVE_SLIDES
  // Easiest is to just use standard functions instead of useCallback since ACTIVE_SLIDES changes.
  c = c.replace(
    /const nextSlide = useCallback\(\(\) => \{([\s\S]*?)\}, \[\]\)/g,
    'const nextSlide = () => {$1}'
  );
  c = c.replace(
    /const prevSlide = useCallback\(\(\) => \{([\s\S]*?)\}, \[\]\)/g,
    'const prevSlide = () => {$1}'
  );
  
  fs.writeFileSync(file, c);
  console.log('Patched ' + file);
});
