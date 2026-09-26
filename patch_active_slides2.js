const fs = require('fs');

['app/guest-experience/page.tsx', 'app/guest-experience-light/page.tsx'].forEach(file => {
  let c = fs.readFileSync(file, 'utf8');

  const blockOld = `  const ACTIVE_SLIDES = SLIDES.filter(s => kioskConfig?.enabledSlides ? kioskConfig.enabledSlides.includes(s.id) : true)
  const baseSlide = ACTIVE_SLIDES[currentSlideIndex] || SLIDES[0]`;
  
  const blockNew = `  let ACTIVE_SLIDES = SLIDES
  if (kioskConfig && kioskConfig.enabledSlides && kioskConfig.enabledSlides.length > 0) {
    ACTIVE_SLIDES = SLIDES.filter(s => kioskConfig.enabledSlides.includes(s.id))
  }
  const baseSlide = ACTIVE_SLIDES[currentSlideIndex] || SLIDES[0]`;

  if (c.includes(blockOld)) {
    c = c.replace(blockOld, blockNew);
    
    // Also fix the optional chaining below just in case
    c = c.replace(
      'title: kioskConfig?.slideOverrides?.[baseSlide.id]?.title || baseSlide.title,',
      'title: (kioskConfig && kioskConfig.slideOverrides && kioskConfig.slideOverrides[baseSlide.id] && kioskConfig.slideOverrides[baseSlide.id].title) || baseSlide.title,'
    );
    c = c.replace(
      'subtitle: kioskConfig?.slideOverrides?.[baseSlide.id]?.subtitle || baseSlide.subtitle,',
      'subtitle: (kioskConfig && kioskConfig.slideOverrides && kioskConfig.slideOverrides[baseSlide.id] && kioskConfig.slideOverrides[baseSlide.id].subtitle) || baseSlide.subtitle,'
    );
    
    fs.writeFileSync(file, c);
    console.log('Patched ' + file);
  } else {
    console.log('Could not find block in ' + file);
  }
});
