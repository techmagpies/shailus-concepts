/* ==========================================
   MOBILE MENU (IF YOU HAVE NAV)
========================================== */

const menuBtn = document.querySelector(".menu-btn");
const nav = document.querySelector("nav");

if(menuBtn){

    menuBtn.addEventListener("click",()=>{

        nav.classList.toggle("active");

    });

}

/* ==========================================
   ACTIVE NAV LINK
========================================== */

const links = document.querySelectorAll("nav a");

links.forEach(link=>{

    if(link.href === window.location.href){

        link.classList.add("active");

    }

});

/* ==========================================
   SCROLL EFFECT (HEADER SHADOW)
========================================== */

window.addEventListener("scroll",()=>{

    const header = document.querySelector("header");

    if(header){

        if(window.scrollY > 50){

            header.style.boxShadow = "0 5px 20px rgba(0,0,0,.1)";

        }else{

            header.style.boxShadow = "none";

        }

    }

});

/* ==========================================
   SMOOTH SCROLL
========================================== */

document.querySelectorAll('a[href^="#"]').forEach(anchor => {

    anchor.addEventListener("click", function (e) {

        e.preventDefault();

        const target = document.querySelector(this.getAttribute("href"));

        if(target){

            target.scrollIntoView({

                behavior:"smooth"

            });

        }

    });

});