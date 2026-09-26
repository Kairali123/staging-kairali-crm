const fs = require('fs');

['app/guest-experience/page.tsx', 'app/guest-experience-light/page.tsx'].forEach(file => {
  let c = fs.readFileSync(file, 'utf8');

  // Instead of using currentSlide.title / subtitle directly, we will create a helper function or inject variables
  
  const injectTarget = '  const t = TRANSLATIONS[lang]\n  const currentSlide = SLIDES[currentSlideIndex]';
  const injectReplacement = `  const t = TRANSLATIONS[lang]
  const baseSlide = SLIDES[currentSlideIndex]
  const currentSlide = {
    ...baseSlide,
    title: kioskConfig?.slideOverrides?.[baseSlide.id]?.title || baseSlide.title,
    subtitle: kioskConfig?.slideOverrides?.[baseSlide.id]?.subtitle || baseSlide.subtitle,
  }`;

  if (c.includes(injectTarget)) {
    c = c.replace(injectTarget, injectReplacement);
    console.log('Patched slides in ' + file);
  }

  // Also filter enabled slides!
  const enabledTarget = 'const nextSlide = useCallback(() => {';
  const enabledReplacement = `  // Filter slides based on config
  const ACTIVE_SLIDES = SLIDES.filter(s => kioskConfig?.enabledSlides ? kioskConfig.enabledSlides.includes(s.id) : true)
  const currentSlide = {
    ...ACTIVE_SLIDES[currentSlideIndex] || SLIDES[0],
    title: kioskConfig?.slideOverrides?.[(ACTIVE_SLIDES[currentSlideIndex] || SLIDES[0]).id]?.title || (ACTIVE_SLIDES[currentSlideIndex] || SLIDES[0]).title,
    subtitle: kioskConfig?.slideOverrides?.[(ACTIVE_SLIDES[currentSlideIndex] || SLIDES[0]).id]?.subtitle || (ACTIVE_SLIDES[currentSlideIndex] || SLIDES[0]).subtitle,
  }

  const nextSlide = useCallback(() => {`;

  // Actually, wait, replacing currentSlide logic is easier if we just change the references. Let's do it carefully.
  fs.writeFileSync(file, c);
});
