var surl_info = false;
function shortener(){
  var orig_url = encodeURI(btoa(prompt("Please enter the url wants to be shortten",window.location.href)));
  let target_host = prompt("What host do you want to use?","{{host}}");
  try{
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "http{{s}}://{{host}}/shortener?url=" + orig_url + "&host=" + target_host, false);
    xhr.send(null);
    let res = xhr.responseText.split("|");
    prompt("Your input has been shortten", res[0]);
    let makeqr = confirm("Want QR?");
    if(makeqr){
    console.log(res[1]);
      openb64img(res[1]);
    }
  }catch(err){
    window.open("http{{s}}://{{host}}/shortener?url=" + orig_url + "&host=" + target_host);
  }
}
function surl(orig_url){
  let xhr = new XMLHttpRequest();
  xhr.open("GET", "http{{s}}://{{host}}/shortener?url=" + encodeURI(btoa(orig_url)) + "&host={{host}}", false);
  xhr.send(null);
  surl_info = (xhr.responseText).split("|");
}
function prompt_curr_surl(){
  if(!surl_info){surl(window.location.href);}
  prompt("Current page",surl_info[0]);
}
function openb64img(base64URL){
  let win = window.open();
  win.document.write('<iframe src="' + base64URL  + '" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>');
}
function auto_short_url(){
  if(!surl_info){surl(window.location.href);}
  document.getElementById("curr_page_short_url").innerHTML = surl_info[0];
}
function auto_short_qr(){
  if(!surl_info){surl(window.location.href);}
  document.getElementById("curr_page_qr").innerHTML = "<img src=\"" + surl_info[1] + "\" \/>";
}
