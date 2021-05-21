//alert('Grrr.')
'use strict';

const href = window.location.href
const splithref = href.split("/");
const pattern = /([1-9])/;


if(pattern.test(splithref[splithref.length-1])){
    const options = {

    }
};

 chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
   const pieces = document.querySelectorAll(".piece");

     console.log(pieces)

     let allpieces = []

     pieces.forEach(p => {
         const splitclassname = p.className.split(" ");
         const piece = {
             name: splitclassname[1],
             square: splitclassname[2].split("-")[1],
         }
         allpieces.push(piece)
     })

     sendResponse({
         count: pieces.length,
         href: href,
         all_pieces: allpieces
     })
 })
/*
const re = new RegExp('king', 'gi')
const matches = document.documentElement.innerHTML.match(re) || []

chrome.runtime.sendMessage({
    url: window.location.href,
    count: matches.length
})
 */