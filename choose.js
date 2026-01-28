const CHOOSE = "choose";
const UID = makeKey("uid");
const NAME = "Name";
const DESC = "Description";
const WEIGHT = "Weight";
const FAVOR = "Favor";
const ACTIONS = makeKey("actions");
const ARR_VALUE = "Values";
const HIDDEN_ARR_VALUE = makeKey("hidden_arr_value");
const LOWER = "Lower";
const UPPER = "Upper";
const RESET = "Reset";
const SELECTED = "Selected";
const BIN_I = makeKey("bin_i");
const BIN_LOW = makeKey("bin_low");
const BIN_HIGH = makeKey("bin_high");
const E404 = "Error 404"
const ARR_SETTING = "Settings";
const ARR_ATTRS = "Attributes";
const ARR_DECISIONS = "Decisions";
const ADD_ATTR = "Add Attribute";
const ADD_DECISION = "Add Decision";
const ARR_MODEL = "Models";
const ADD = "Add";
const KIND = makeKey("kind");
const ADD_SETTING = "Add Setting";
const NO_VISIT = makeKey("visit"); // if defined(set, true, !0 etc) in an object, it won't handle clicks
const ON_CLOSE = makeKey("close"); // close action called each time, if defined on close, current object
const ON_DELETE = makeKey("delete");
const ON_SAVE = makeKey("save");

/**
 * @brief checks if the string s is a private key
 * @param {string} s
 * @returns {boolean}
 */
function isPrivateKey(s) {
  return s.at(0) === "$";
}

/**
 * @brief creates a string that is a private key
 * @param {string} raw_s 
 * @returns {string}
 */
function makeKey(raw_s) {
  return "$" + raw_s;
}

/**
 * @returns {string} UID
 */
function makeUID() {
  return crypto.randomUUID();
}

/**
  * @returns {} value
  * */
function makeValue(value = {
    [UID]: makeUID(),
    [KIND]: "Value",
    [NAME]: "",
    [DESC]: "",
    [WEIGHT]: 1.0
  }) {

  value[ACTIONS] = {
    [ON_CLOSE]: (_) => {
      const attribute = tracer.previous();
      // sort here why? not in action add because when added the variables have default values
      // therefore when sorted, sort using those defaults values, after change of value
      attribute[ARR_VALUE].sort((a, b) => a[WEIGHT] - b[WEIGHT]); // sort Values
    }
  };

  return value;
}

function makeAttribute(attribute = {
    [UID]: makeUID(),
    [KIND]: "Attribute",
    [NAME]: "",
    [DESC]: "",
    [FAVOR]: 1.0,
    [ARR_VALUE]: [],
  }) {

  attribute[ACTIONS] = {
      [ON_CLOSE]: (attribute) => {
        const model = tracer.previous();
        // make the correct corresponding setting for attribute in each decision
        model[ARR_DECISIONS].forEach(decision => {
          const pos = decision[ARR_SETTING].findIndex(setting => setting[UID] == attribute[UID]);
          decision[ARR_SETTING][pos] = makeSetting(attribute);
        });
      },
      [ADD]: (attribute) => {
        const value = makeValue();
        attribute[ARR_VALUE].push(value);
        return value;
      },
    };

  return attribute;
}

function binSearch(size, mid, low, high, option = 0) {
  if (size === 0) {
    return {i: -1, low: 0, high: -1};
  }

  if (mid === undefined || mid === null || mid < 0 || mid >= size) {
    low = 0;
    high = size - 1;
  } else if (option < 0) /* lower */ {
    high = mid - 1;
  } else if (option > 0) /* higher */ {
    low = mid + 1;
  }

  if (low > high) {
    return binSearch(size, -1);
  }

  mid = Math.floor((low + high) / 2); // update
  
  return {
    i: mid,
    low: low,
    high: high,
  };
}

function binSearchSetting(setting, option = 0) {
  const array = setting[HIDDEN_ARR_VALUE];
  const size = array.length;
  let low, i, high;

  if (setting[BIN_I] === undefined || setting[BIN_I] === null) {
    ( {i, low, high} = binSearch(size, -1) );
  } else {
    ( {i, low, high} = binSearch(size, setting[BIN_I], setting[BIN_LOW], setting[BIN_HIGH], option) );
  }

  setting[BIN_I] = i;
  setting[BIN_LOW] = low;
  setting[BIN_HIGH] = high;

  if (i == -1 || i == undefined || !(i >= 0 && i < size)) {
    setting[SELECTED] = {
            [UID]: makeUID(),
            [NAME]: "No values to select", 
            [KIND]: "Error", 
            [NO_VISIT]: true,
            [ACTIONS]: {}, // [NOTE] if not provided causes rendering error
          };
  } else {
    setting[SELECTED] = array[setting[BIN_I]];
  }
}

function attachSetting(setting) {
  setting[ACTIONS] = {
      [RESET]: (setting) => {
        setting[BIN_I] = setting[BIN_LOW] = setting[BIN_HIGH] = undefined;
        binSearchSetting(setting, 0);
      },
      [LOWER]: (setting) => binSearchSetting(setting, -1),

      [UPPER]: (setting) => binSearchSetting(setting, 1),
    };
}

// setting(s) are immutable
function makeSetting(attribute, setting = {
    [UID]: attribute[UID],
    [KIND]: "Setting",
    [NAME]: {
            [UID]: makeUID(),
            [NAME]: attribute[NAME], 
            [KIND]: "String", 
            [NO_VISIT]: true,
            [ACTIONS]: {}, // [NOTE] if not provided causes rendering error
          },
    [DESC]: {
            [UID]: makeUID(),
            [NAME]: attribute[DESC], 
            [KIND]: "String", 
            [NO_VISIT]: true,
            [ACTIONS]: {}, // [NOTE] if not provided causes rendering error
    },
    [FAVOR]: {
            [UID]: makeUID(),
            [NAME]: attribute[FAVOR].toString(), 
            [KIND]: "Number", 
            [NO_VISIT]: true,
            [ACTIONS]: {}, // [NOTE] if not provided causes rendering error
    },
    [HIDDEN_ARR_VALUE]: attribute[ARR_VALUE],
  }) {

  attachSetting(setting);

  setting[ACTIONS][RESET](setting);

  return setting;
}

// depends on attribute and model to be configured and setup and utilized
function makeDecision(decision = {
    [UID]: makeUID(),
    [KIND]: "Decision",
    [NAME]: "",
    [DESC]: "",
    [ARR_SETTING]: [],
  }) {

  decision[ACTIONS] = {};

  return decision;
}

function makeModel(
  model = {
    [UID]: makeUID(),
    [KIND]: "Model",
    [NAME]: "",
    [DESC]: "",
    [ARR_ATTRS]: [],
    [ARR_DECISIONS]: [],
  }) {

  model[ACTIONS] = {
      [ON_DELETE]: (model, o) => {
        if (o[KIND] == "Attribute") {
          model[ARR_DECISIONS].forEach(decision => {
            const pos = decision[ARR_SETTING].findIndex(setting => setting[UID] == o[UID]);
            decision[ARR_SETTING].splice(pos, 1);
          });
        }
      },
      [ADD_ATTR]: (model) => {
        const attribute = makeAttribute();
        model[ARR_ATTRS].push(attribute);
        // add attribute to all decisions
        for (const decision of model[ARR_DECISIONS]) {
          decision[ARR_SETTING].push(makeSetting(attribute));
        }

        return attribute;
      },

      [ADD_DECISION]: (model) => {
        const decision = makeDecision();
        model[ARR_DECISIONS].push(decision);

        // add each attribute to decision
        model[ARR_ATTRS].forEach(attribute => {
          decision[ARR_SETTING].push(makeSetting(attribute));
        });
        
        return decision;
      },

      "Select Decision": (model) => {
        const found_attribute = model[ARR_ATTRS].find(attribute => attribute[ARR_VALUE].length == 0);

        if (found_attribute) {
          return found_attribute;
        } else {
          let selected_decision, 
              selected_sum,
              replace_it = true; // first decision must replace

          model[ARR_DECISIONS].forEach(decision => {
            let sum = 0;

            decision[ARR_SETTING].forEach(setting => {
              sum = sum + (parseFloat(setting[FAVOR]) * setting[SELECTED][WEIGHT]);
            });

            if (selected_decision && sum > selected_sum) {
              replace_it = true;
            }

            if (replace_it) {
              selected_decision = decision;
              selected_sum = sum;
              replace_it = false;
            }
          });
          
          return selected_decision;
        }
      }
    };

  return model;
}

function correction(root) {
  root[ARR_MODEL].forEach(model => {
    makeModel(model);

    model[ARR_ATTRS].forEach(attribute => {
      makeAttribute(attribute);
      attribute[ARR_VALUE].forEach(value => makeValue(value));
    });

    model[ARR_DECISIONS].forEach(decision => {
      makeDecision(decision);
      decision[ARR_SETTING].forEach(setting => attachSetting(setting));
    });
  });

  return root;
}

function configure() {
  const rootString = localStorage.getItem(CHOOSE) ;
  root = rootString ? 
    {
      ...correction(JSON.parse(rootString)), 
    }:
    {
      [UID]: makeUID(),
      [KIND]: "Choose",
      [ARR_MODEL]: [],
    };

  root[ACTIONS] = {
    [ADD]: (root) => {
      const model = makeModel();
      root[ARR_MODEL].push(model);
      return model;
    },
  };

  if (tracer) {
    tracer.reset(root);
  } else {
    tracer = new Tracer(root);
  }
}

function save() {
  tracer.load(); // explicitly load
  tracer.invisibleAction(ON_SAVE, tracer.current());
  localStorage.setItem(CHOOSE, JSON.stringify(root));
}

function dump() {
  tracer.append(
    {
      [UID]: makeUID(),
      [KIND]: "Dialog",
      "Title": {
        [UID]: makeUID(),
        [NAME]: "Clear Information",
        [NO_VISIT]: true,
        [ACTIONS]: {}, // [NOTE] if not provided causes rendering error
      },
      "Content": {
        [UID]: makeUID(),
        [NAME]: "Are you sure, you want to remove all models?",
        [NO_VISIT]: true,
        [ACTIONS]: {}, // [NOTE] if not provided causes rendering error
      },
      [ACTIONS]: {
        "Yes": (_) => {
          localStorage.removeItem(CHOOSE);
          configure();
        },
        "No": (_) => {
          tracer.back();
        },
      },
    }
  );
}

function simpleRender(key, value, vTypeOf) {
  const info = `id="${key}"`;

  switch (vTypeOf) {
    case "string":
      return (key == DESC) ?
        `<textarea ${info}>${value}</textarea>`:
        `<input ${info} name="${key}" type="text" value="${value}">`;

    case "number": return `<input ${info} name="${key}" type="number" value="${value}">`;

    case "boolean": return `<input ${info} name="${key}" type="checkbox" ${value ? "checked" : ""}>`;

    default: return "";
  }
}

function subArrayObjectRender(o, arrayKey) {
  const name = typeof o[NAME] == "string" ? o[NAME] : o[NAME][NAME];

  return `<li><div id="${o[UID]}"
    onclick="event.stopPropagation(); tracer.doubleForward('${arrayKey}', '${o[UID]}', event)" 
    style="height: 35px;
      width: 1000px;
      background-color: whitesmoke; 
      margin-top: 5px; margin-bottom: 5px; position: relative;">

      ${name}
        <span style="position: absolute; right: 0%;" 
          onclick="event.stopPropagation(); tracer.doubleRemove('${arrayKey}', '${o[UID]}')">✖️</span>
    </div></li>`;
}

function subObjectRender(o, key) {
  const onclick = o[NO_VISIT] ? "": `event.stopPropagation(); tracer.forward('${key}')`;

  return `<div id="${o[UID]}"
    onclick="${onclick}" 
    style="width: fit-content; max-width: 800px; background-color: bisque;">
      ${o[NAME]}
    </div>`;
}

function render(refObject) {
  let mainContent = `<div id="${refObject[UID]}">`; // DIV ancestor open
  let sideContent = "";

  for (const key in refObject) {
    if (isPrivateKey(key)) {
      continue;
    }

    const value = refObject[key];
    const vTypeOf = typeof value;

    mainContent += 
      /* DIV.PART */`<div class="part" style="margin-top: 10px; margin-bottom: 10px">
                        <div style="font-weight: bold;">${key}:</div>`; // DIV what is it

    switch(vTypeOf) {
      case "function":
      case "undefined":
      case "bigint":
      case "symbol": break;

      case "object": {
        if (Array.isArray(value)) {
          if (value.length == 0) {
            mainContent += 
              `<span><input type="text" value="NULL" disabled 
                style="width:5ch; font-size: 2rem; font-weight: bold;"></span>`;
          } else {
            // mainContent += 
            //   `<span class="subtool"
            //     style="font-size: 1.9rem; position: absolute; transform: translate(1040px, -100%);">📎</span>`; // HERE!!@
            mainContent += "<ol class='miniScreen'>";
            value.forEach(o => mainContent += subArrayObjectRender(o, key));
            mainContent += "</ol>";
          }
        } else {
          mainContent += "<div class='miniScreen'>";
          mainContent += subObjectRender(value, key);
          mainContent += "</div>";
        }
      } break;

      // [Handles] string, number, boolean
      default: {
        // mainContent += `<span class="subtool"
        //         style="font-size: 1.9rem; position: absolute; transform: translate(770px, -100%);">📎</span>`;
        mainContent += simpleRender(key, value, vTypeOf); break;
      }
    }

    mainContent += "</div>"; // DIV.PART close
  }

  // actions
  Object.keys(refObject[ACTIONS]).forEach(label => {
    if (!isPrivateKey(label)) {
      sideContent += 
      `<div onclick="event.stopPropagation(); tracer.action('${label}')">${label}</div>`;
    }
  });
  
  
  // html render
  document.querySelector("#side").innerHTML = sideContent;
  document.querySelector("#content").innerHTML = mainContent + "</div>"; // DIV ancestor close
}

class Tracer {
  /**
   * @param {object} root 
   */
  constructor(root) {
    this.reset(root);
  }

  reset(root) {
    this.elems = [root];
    this.render();
  }

  root() {
    return this.elems[0];
  }

  _actionResultHandle(elem) {
    if (elem) {
      this.append(elem); // calls render() internally
    } else {
      this.render();
    }
  }

  action(name) {
    const cur = this.current();
    const next = cur[ACTIONS][name](cur);
    this._actionResultHandle(next);    
  }

  invisibleAction(sym, extra) {
    const cur = this.current();
    const fn = cur[ACTIONS][sym];
    
    if (fn) {
      this._actionResultHandle(fn(cur, extra));
    }
  }

  previous() {
    return (this.elems.length > 1) ? this.elems[this.elems.length - 2] : null;
  }

  current() {
    return this.elems[this.elems.length - 1];
  }

  append(o) {
    this.load(); // load previous current info from DOM
    this.elems.push(o);
    this.render();
  }

  back() {
    this.load(); // load previous current info from DOM

    if (this.elems.length > 1) {
      this.elems.pop();
    }

    this.render();
  }

  doubleRemove(arrayKey, uid) {
    const array = this.current()[arrayKey];
    const pos = array.findIndex(e => e[UID] == uid);
    this.invisibleAction(ON_DELETE, array[pos]);
    array.splice(pos, 1); // !!!?! :splice -1 bad
    this.render();
  }

  /**
   * 
   * @param {string} key used to index 'current' and render the corresponding value(object) at key
   */
  forward(key) {
    this.append(this.current()[key]);
  }

  /**
   * 
   * @param {string} cascaded key of array in current
   * @param {string} key uid of some object(where o[UID] is key) in array
   */
  doubleForward(cascaded, key) {
    const array = this.current()[cascaded];
    this.append(array.find(o => o[UID] == key));
  }

  reverse(uid) {
    const index = this.elems.findIndex(e => e[UID] == uid);
    
    this.load(); // load previous current info from DOM

    if (index != -1) {
      this.elems.length = index + 1; // no remove selected to be current
    }

    this.render();
  }

  /**
   * 
   * @warn call before any changes to tracer, especially after forward, reverse, etc.
   */
  load() {
    const cur = this.current();

    for (const key in cur) {
      if (isPrivateKey(key)) {
        continue;
      }

      const oldValue = cur[key];
      const self = document.querySelector(`#content #${key}`);

      switch (typeof oldValue) {
        case "string": {
          cur[key] = self.value;
        } break;
        case "number": cur[key] = parseFloat(self.value); break;
        case "boolean": cur[key] = self.checked; break;
      }
    }

    this.invisibleAction(ON_CLOSE);
  }

  _breadcrumbs() {
    let breadCrumbs = "";

    for (let i = 0; i < this.elems.length; i++) {
      const item = this.elems[i];
      const name = typeof item[NAME] == "string" ? item[NAME] : "";

      breadCrumbs +=
        `<span class="spanFlash" 
          ${this.elems.length - i > 1 ? `onclick="tracer.reverse('${item[UID]}')"` : ""}>${name + ":" + item[KIND]}</span>`;
    }

    document.querySelector("#tails").innerHTML = breadCrumbs;
  }

  render() {
    this._breadcrumbs();
    render(this.current());
  }
}

var root, tracer;
