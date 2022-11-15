// ==UserScript==
// @name           Olympics filter
// @namespace      http://code.kjonigsen.net/
// @include        http://www.dagbladet.no/
// @include        http://www.vg.no/
// @include        http://www.aftenposten.no/
// @include        http://www.adressa.no/
// ==/UserScript==

let startTime = new Date().getTime();

/* filters */
let elementTypes = ["a", "p", "h1", "h2", "h3", "article"];
let filters = ["\\bOL(-?)\\b", "Northug"];
let blockedUrls = ["/sport/", "/ol/", "https://ol.", "/100Sport/", "studio=vinter-ol", "ol2018", "https://www.dagbladet.no/sport", "-ol-studio-"];

/* glow settings */
let opacity = 0.15; // 1 = 100%
let delay = 50;     // ms
let steps = 0.2; // opacity steps per interval

/* working variables */
let elements = new Array();
let debug = "";

/* setup code */

let blockedUrlRxs = blockedUrls.map(i => new RegExp(i));
let filterRxs = filters.map(i => new RegExp(i, "mi"));

/* identify nodes */

for (let elementType of elementTypes) {
    let elementNodes = document.getElementsByTagName(elementType);
    processElements(elementNodes);
}

let links = document.getElementsByTagName("a");
processLinks(links);

/*  process nodes */

let numNodes = elements.length;
let maxDepth = 0;
let numEliminated = 0;

if (numNodes !== 0) {
    detectNodeDepth();
    elements.sort(depthFirstSort);
    maxDepth = elements[0].getAttribute("TF_treedepth");
    numEliminated = eliminateChildren();

    /* hide nodes */

    for (let node in elements) {
        setGlow(node);
    }
}

let endTime = new Date().getTime();
let time = endTime - startTime;
basicDiagnostics();
// outputDebugInfo();

/* done */



/* identification functions */

function processFilter(dataNodes, filterNodes, propertyExtractor) {
    for (let dataNode of dataNodes) {
        let match = false;
        let property = propertyExtractor(dataNode);

        for (let filterNode of filterNodes) {
            match = match || property.match(filterNode) != null;
        }

        if (match !== false) {
            debug += property + "\r\n";
            registerElement(dataNode);
        }
    }
}

function processElements(nodes) {
    processFilter(nodes, filterRxs, node => node.textContent);
}

function processLinks(nodes) {
    processFilter(nodes, blockedUrlRxs, node => node.href);
}

function registerElement(element) {
    // ignore hidden elements
    if (element.style.display !== "none") {
        if (element.nodeName !== "DIV" && element.nodeName !== "UL" && element.nodeName !== "ARTICLE") {
            let parent = element.parentNode;

            if (parent) {
                registerElement(parent);
            }
        }
        else {
            // dont add dupes
            if (false === isRegistered(element)) {
                elements[elements.length] = element;
            }
        }
    }
}

function isRegistered(node) {
    for (let i = 0; i < elements.length; i++) {
        let arrayNode = elements[i];
        if (arrayNode === node) {
            return true;
        }
    }

    return false;
}

/* fading/glowing functions */

function setGlow(element) {
    // possible null values from child-elimination
    if (element != null) {
        element.style.opacity = opacity;
        element.addEventListener("mouseover", glowIn, false);
        element.addEventListener("mouseout", glowOut, false);
    }
}

function glowIn(e) {
    doGlowGlide(e, 1);
}

function glowOut(e) {
    doGlowGlide(e, opacity);
}

function doGlowGlide(e, target) {
    let element = e.currentTarget;
    let current = parseFloat(element.style.opacity);
    element.setAttribute("TF_opacity", target);

    registerTimeout(element, current);
}

function registerTimeout(e, current) {
    window.setTimeout(function () { doProcess(e, current); }, delay);
}

function doProcess(e, current) {
    let target = parseFloat(e.getAttribute("TF_opacity"));
    let newValue = target;

    if (current > target) {
        newValue = current - steps;
        newValue = newValue < target ? target : newValue;
    }
    else if (current < target) {
        newValue = current + steps;
        newValue = newValue > target ? target : newValue;
    }

    e.style.opacity = newValue;

    if (newValue !== target) {
        registerTimeout(e, newValue);
    }
}

/* node cleanup */

function detectNodeDepth() {
    for (let node of elements) {
        let depth = 0;
        let parentNode = node;

        while (parentNode != null) {
            parentNode = parentNode.parentNode;
            depth++;
        }

        node.setAttribute("TF_treeDepth", depth);
    }
}

function depthFirstSort(an, bn) {
    let a = an.getAttribute("TF_treeDepth");
    let b = bn.getAttribute("TF_treeDepth");
    return b - a;
}

function eliminateChildren() {
    let eliminated = 0;
    let seekDepth = 2;

    for (let i = 0; i < elements.length; i++) {
        let node = elements[i];

        let hasParent = isParentInList(node, seekDepth);
        if (hasParent) {
            elements[i] = null;
            eliminated++;
        }
    }

    return eliminated; // for diagnostic/debugging info
}

function isParentInList(node, seekDepth) { // two levels of recursion
    let parentNode = node.parentNode;

    for (let i = 0; i < elements.length; i++) {
        let otherNode = elements[i];

        if (otherNode === parentNode) {
            return true;
        }
    }

    seekDepth--;
    if (seekDepth !== 0) {
        return isParentInList(parentNode, seekDepth);
    }

    return false;
}

/* diagnostic/debugging output */

function basicDiagnostics() {
    let diagnostics = "DIAGNOSTICS:\r\nElements detected: " + numNodes + ", Elements Eliminated: " + numEliminated + ", Runtime: " + time;

    let diagElement = document.createElement("div");
    diagElement.style.display = "none";
    diagElement.style.zIndex = "1000";
    diagElement.style.backgroundColor = "white";

    let preElement = document.createElement("pre");
    let diagContent = document.createTextNode(diagnostics);
    preElement.appendChild(diagContent);
    diagElement.appendChild(preElement);
    document.getElementsByTagName("body")[0].appendChild(diagElement);
}

function outputDebugInfo() {
    let debugElement = document.createElement("div");
    debugElement.style.display = "none";
    debugElement.style.zIndex = "1000";
    debugElement.style.backgroundColor = "white";

    let preElement = document.createElement("pre");
    let debugContent = document.createTextNode("DEBUG:\r\n" + debug);
    preElement.appendChild(debugContent);
    debugElement.appendChild(preElement);
    document.getElementsByTagName("body")[0].appendChild(debugElement);
}
