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
    
    console.log(pageName,document.getElementById(pageName))
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
  

if ('serviceWorker' in navigator) {
  console.log("service !")
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('Service Worker registered with scope: ', registration.scope);
      })
      .catch((error) => {
        console.log('Service Worker registration failed: ', error);
      });
  });
}else {
  console.log("PWA failure")
}

    const defaultOpen = document.getElementById("defaultOpen");
    if (defaultOpen) {
        defaultOpen.click();
    }

    (function () {
      "use strict";
    
      // define variables
      var items = document.querySelectorAll(".timeline li");
    
      // check if an element is in viewport
      // http://stackoverflow.com/questions/123999/how-to-tell-if-a-dom-element-is-visible-in-the-current-viewport
      function isElementInViewport(el) {
        var rect = el.getBoundingClientRect();
        return (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <=
            (window.innerHeight || document.documentElement.clientHeight) &&
          rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
      }
    
      function callbackFunc() {
        for (var i = 0; i < items.length; i++) {
          if(i==0){
            items[i].classList.add("in-view");
          }

          if (isElementInViewport(items[i])) {
            items[i].classList.add("in-view");
          }
        }
      }
    
      // listen for events
      window.addEventListener("load", callbackFunc);
      window.addEventListener("resize", callbackFunc);
      window.addEventListener("scroll", callbackFunc);
      
    })();