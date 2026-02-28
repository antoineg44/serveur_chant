var ac = {
    // (A) PROPERTIES
    now : null, // current "focused instance"
  
    // (B) ATTACH AUTOCOMPLETE
    //  target : target field
    //  data : suggestion data (array), or url (string)
    //  post : optional, extra data to send to server
    //  delay : optional, delay before suggestion, default 500ms
    //  min : optional, minimum characters to fire suggestion, default 2
    //  select : optional, function to call on selecting an option
    attach : inst => {
      // (B1) SET DEFAULTS
      if (inst.delay == undefined) { inst.delay = 500; }
      if (inst.min == undefined) { inst.min = 1; }
      inst.timer = null; // autosuggest timer
      inst.ajax = null; // ajax fetch abort controller
  
      // (B2) UPDATE HTML
      inst.target.setAttribute("autocomplete", "off");
      inst.hWrap = document.createElement("div"); // autocomplete wrapper
      inst.hList = document.createElement("ul"); // suggestion list
      inst.hList.style.position = "relative";

      inst.hWrap.className = "nice-form-group acWrap";
      inst.hList.className = "acSuggest";
      inst.hList.style.display = "none";
      inst.target.parentElement.insertBefore(inst.hWrap, inst.target);
      inst.hWrap.appendChild(inst.target);
      inst.hWrap.appendChild(inst.hList);
  
      // (B3) KEY PRESS LISTENER
      inst.target.addEventListener("keyup", evt => {
        // (B3-1) CLEAR OLD TIMER & SUGGESTION BOX
        ac.now = inst;
        if (inst.timer != null) { window.clearTimeout(inst.timer); }
        if (inst.ajax != null) { inst.ajax.abort(); }
        inst.hList.innerHTML = "";
        inst.hList.style.display = "none";
  
        // (B3-2) CREATE NEW TIMER - FETCH DATA FROM SERVER OR ARRAY
        if (inst.target.value.length >= inst.min) {
          if (typeof inst.data == "string") { inst.timer = setTimeout(() => ac.fetch(), inst.delay); }
          else { inst.timer = setTimeout(() => ac.filter(), inst.delay); }
        }
      });
    },
  
    // (C) FILTER ARRAY DATA
    filter : () => {
      // (C1) SEARCH DATA
      let search = ac.now.target.value.toLowerCase(),
          complex = typeof ac.now.data[0]=="object",
          results = [];
  
      // (C2) FILTER & DRAW APPLICABLE SUGGESTIONS
      for (let row of ac.now.data) {
        let entry = complex ? row.D : row ;
        if (entry.toLowerCase().includes(search)) { results.push(row); }
      }
      ac.draw(results.length==0 ? null : results);
    },
  
    // (D) AJAX FETCH SUGGESTIONS FROM SERVER
    fetch : () => {
      // (D1) FORM DATA
      let data = new FormData();
      data.append("search", ac.now.target.value);
      if (ac.now.post) {
        for (let [k,v] of Object.entries(ac.now.post)) { data.append(k,v); }
      }
  
      // (D2) FETCH
      ac.now.ajax = new AbortController();
      fetch(ac.now.data, { method:"POST", body:data, signal:ac.now.ajax.signal })
      .then(res => {
        ac.now.ajax = null;
        if (res.status != 200) { throw new Error("Bad Server Response"); }
        return res.json();
      })
      .then(res => ac.draw(res))
      .catch(err => console.error(err));
    },
  
    // (E) DRAW AUTOSUGGEST OPTIONS
    draw : results => { if (results == null) { ac.close(); } else {
      // (E1) RESET SUGGESTIONS
      ac.now.hList.innerHTML = "";
  
      // (E2) DRAW OPTION
      let complex = typeof results[0]=="object";
      for (let row of results) {
        console.log("nouveau result : " + row);
        // (E2-1) SET "DISPLAY NAME"
        let li = document.createElement("li");
        li.style.zIndex = 50;
        li.style.whiteSpace = "normal";
        li.innerHTML = complex ? row.D : row;
  
        // (E2-2) SET SUGGESTION DATA
        if (complex) {
          if (row.V) { li.dataset.val = row.V; }
          let entry = {} , multi = false;
          for (let [k,v] of Object.entries(row)) {
            if (k!="D" && k!="V") { entry[k] = v; multi = true; }
          }
          if (multi) { li.dataset.multi = JSON.stringify(entry); }
        }
  
        // (E2-3) ON SELECTING THIS OPTION
        li.onclick = () => ac.select(li);
        ac.now.hList.appendChild(li);
      }
      ac.now.hList.style.display = "block";
    }},
  
    // (F) ON SELECTING A SUGGESTION
    select : row => {
      // (F1) SET VALUES
      ac.now.target.value = row.dataset.val ? row.dataset.val : row.innerHTML;
      let multi = null;
      if (row.dataset.multi !== undefined) {
        multi = JSON.parse(row.dataset.multi);
        for (let i in multi) { document.getElementById(i).value = multi[i]; }
      }
  
      // (F2) CALL ON SELECT IF DEFINED
      if (ac.now.select != null) { 
        ac.now.select(row);
      }
      ac.now.hWrap.style.setProperty("--nf-input-border-color", "green")

      ac.now.exec(ac.now.target, row.textContent);
      ac.close();
    },
  
    // (G) CLOSE AUTOCOMPLETE
    close : () => { if (ac.now != null) {
      if (ac.now.ajax != null) { ac.now.ajax.abort(); }
      if (ac.now.timer != null) { window.clearTimeout(ac.now.timer); }
      ac.now.hList.innerHTML = "";
      ac.now.hList.style.display = "none";
      ac.now = null;
    }},
  
    // (H) CLOSE AUTOCOMPLETE IF USER CLICKS ANYWHERE OUTSIDE
    checkclose : evt => { if (ac.now!=null && ac.now.hWrap.contains(evt.target)==false) {
      //document.getElementById() --nf-input-focus-border-color
      ac.now.hWrap.style.setProperty("--nf-input-border-color", "red")
      ac.close();
    }}
  };
  document.addEventListener("click", ac.checkclose);