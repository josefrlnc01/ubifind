import {  auth, db } from "../firebaseConfig.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { showLoadingPrincSpinner, hideLoadingPrincSpinner } from "../script.js";

const container = document.querySelector('.comparison-section')
// Crear un grid personalizado que sigue el cursor

const floatingNavbar = document.querySelector('.floating-navbar')
const headerLinksNav = document.querySelector('.header-links-nav')


document.addEventListener('DOMContentLoaded',() => {
  showLoadingPrincSpinner()
  onAuthStateChanged(auth, async (user) => {
    
    
    if (user) {
        // Si hay usuario en landing, ir a la app
        window.location.href = '/app/index.html';
        return;
    }
    // Si no hay usuario, quedarse en landing
    hideLoadingPrincSpinner();
     document.body.classList.add('loaded');
});


})





function showNavbar(){
  if(!floatingNavbar){
    console.warn('Elemento no encontrado en el DOM')
    return
  }
  
  floatingNavbar.classList.toggle('visible')
  if(floatingNavbar.classList.contains('visible')){
    floatingNavbar.style.display = 'flex'
    headerLinksNav.style.display = 'flex'
  }
  else{
    floatingNavbar.style.display = 'none'
    headerLinksNav.style.display = 'none'
  }
 
}

const menu = document.querySelector('.menu')

menu.addEventListener('click', () => {
  showNavbar()
})

gsap.registerPlugin(ScrollTrigger);
const comparisonSection = document.querySelector('.comparison-section')
if(comparisonSection){
  gsap.from(".comparison-section", {
    scrollTrigger: {
        trigger: ".comparison-section",
        start: "top 90%", // Se dispara cuando el top del elemento entra al 90% del viewport
      },
    scale: 0.6,
    opacity: 0,
    duration: 1.2,
    ease: "back.out(1.7)"
});

}

const textElement = document.querySelector('.title-reasons')

const text = textElement.textContent
textElement.textContent = ''

let isInViewTitle = null
gsap.to({}, {
    scrollTrigger:{
        trigger : '.title-reasons',
        
        start : 'top 90%',
        onEnter : () => {
            let i = 0
            if(!isInViewTitle){
                const interval = setInterval(() => {
                    document.querySelector('.title-reasons').textContent += text[i++];
                    
                    if(i >= text.length) clearInterval(interval)
                }, 50)
            isInViewTitle = true
            }
            
        },
        background:'#fff'
    }
})


gsap.from(".why-use-it", {
    scrollTrigger: ".why-use-it",
    y: 100,
    opacity: 0,
   
    duration: 1,
    ease: "power2.out"
  });

  gsap.fromTo(".subtitle-reasons", {
   
    opacity: 0.1,
   
  }, 
    {
        scrollTrigger: {
            trigger: ".subtitle-reasons",
            start: "top 70%",
            
          },
        
        background: ' linear-gradient(135deg, #ffffff, rgb(0, 206, 201));',
        opacity: 1, 
        duration: 1,
        ease: "power2.out"
    });



if(window.innerWidth < 1024){
    document.querySelectorAll('.reason').forEach((el,i) => {
        gsap.from(el, {
            scrollTrigger: {
              trigger: el,
              
              start: "top 90%",
             
              
            },
            y: 50,
    opacity: 0,
    duration: 0.6,
    delay: i * 0.2, // pequeño delay secuencial
    ease: 'power2.out'
          });
    })
}


gsap.from(".grid-reasons", {
    scrollTrigger: {
      trigger: ".grid-reasons",
      start: "top 70%",    // cuando la imagen empieza a entrar
      end:'bottom 60%'
      
    },
    duration:1,
    scale: 0.6,
    y: -100,
    opacity: 0,
    ease: "power2.out"
  });

