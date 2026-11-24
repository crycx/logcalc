// JavaScript Document
  function cssVersion (){
        const today = new Date();
        var css = document.querySelectorAll("link")[0];
        css.outerHTML = '<link href="CSS/style.css?v=' +today.getHours() + today.getMinutes() + today.getSeconds() + '" rel="stylesheet" type="text/css">';
    }
    window.onload = cssVersion;
    window.addEventListener("resize",cssVersion);