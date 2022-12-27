  function openPage(evt, pageName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(pageName).style.display = "block";
    evt.currentTarget.className += " active";
  }
  var currentSlide =0;
  
  var slides = document.getElementsByClassName("slide");  
  //every 2 seconds add to the slide
  setInterval(function() {
    if(slides.length < 1){
      return;
    }
    slides[currentSlide].style.display = "none";
    currentSlide+=1;
    if(currentSlide == slides.length) {
      currentSlide = 0;
    }
    slides[currentSlide].style.display = "block";
  
  }, 2000);

  setTimeout(function() {
    document.getElementsByClassName("typewriter")[0].style.border = "none";
  }, 1000);
  



















  /*    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(" active", "");
    } */