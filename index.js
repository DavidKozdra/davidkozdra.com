var startTime = Date.now();

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
  var flag = false;
  var slides = document.getElementsByClassName("slide");  

  //for all 
  for (var i = 0; i < slides.length; i++) {
    slides[i].addEventListener("mouseover", () => {
      flag = true;
      //console.log("mouseover");
    });
    
    slides[i].addEventListener("mouseout", () => {
      flag = false;
      //console.log("mouseover");
    });
  }

  //every 2 seconds add to the slide
  const intervalId = setInterval(function() {
  if (slides.length < 1 || flag) {
    return;
  }
  startTime = Date.now(); //for games 

  slides[currentSlide].style.display = "none";
  currentSlide += 1;
  if (currentSlide === slides.length) {
    currentSlide = 0;
  }
  slides[currentSlide].style.display = "block";
}, 10000);
  setTimeout(function() {
    //console.log(document.getElementsByClassName("typewriter")[0].style.border);
    document.getElementsByClassName("typewriter")[0].style.border = "none";
    //console.log(document.getElementsByClassName("typewriter")[0].style.border);
  }, 1000);

  addEventListener("scroll", (event) => {});

onscroll = (event) => {

  
  var item = document.getElementById("arrow")
  item.style.display = (window.scrollY > 0) ? "block" : "none";
  //console.log(window.scrollY)
};
  