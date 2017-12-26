'use strict';

// https://stackoverflow.com/questions/3953922/is-it-possible-to-write-custom-text-on-google-maps-api-v3#3955258
//adapded from this example http://code.google.com/apis/maps/documentation/javascript/overlays.html#CustomOverlays
//text overlays
function TxtOverlay(pos, txt, cls, map) {
	// Now initialize all properties.
	this.pos = pos;
	this.txt_ = txt;
	this.cls_ = cls;
	this.map_ = map;

	// We define a property to hold the image's
	// div. We'll actually create this div
	// upon receipt of the add() method so we'll
	// leave it null for now.
	this.div_ = null;

	// Explicitly call setMap() on this overlay
	this.setMap(map);
}

TxtOverlay.prototype = new google.maps.OverlayView();

TxtOverlay.prototype.onAdd = function () {
	// Note: an overlay's receipt of onAdd() indicates that
	// the map's panes are now available for attaching
	// the overlay to the map via the DOM.

	// Create the DIV and set some basic attributes.
	var div = document.createElement('DIV');
	div.className = this.cls_;

	div.innerHTML = this.txt_;

	// Set the overlay's div_ property to this DIV
	this.div_ = div;
	var overlayProjection = this.getProjection();
	var position = overlayProjection.fromLatLngToDivPixel(this.pos);
	div.style.left = position.x + 'px';
	div.style.top = position.y + 'px';
	// We add an overlay to a map via one of the map's panes.

	var panes = this.getPanes();
	panes.floatPane.appendChild(div);
}

TxtOverlay.prototype.draw = function () {
	var overlayProjection = this.getProjection();

	// Retrieve the southwest and northeast coordinates of this overlay
	// in latlngs and convert them to pixels coordinates.
	// We'll use these coordinates to resize the DIV.
	var position = overlayProjection.fromLatLngToDivPixel(this.pos);

	var div = this.div_;
	div.style.left = position.x + 'px';
	div.style.top = position.y + 'px';
}

//Optional: helper methods for removing and toggling the text overlay.
TxtOverlay.prototype.onRemove = function () {
	this.div_.parentNode.removeChild(this.div_);
	this.div_ = null;
}

TxtOverlay.prototype.hide = function () {
	if (this.div_) {
		this.div_.style.visibility = "hidden";
	}
}

TxtOverlay.prototype.show = function () {
	if (this.div_) {
		this.div_.style.visibility = "visible";
	}
}

TxtOverlay.prototype.toggle = function () {
	if (this.div_) {
		if (this.div_.style.visibility == "hidden") {
			this.show();
		} else {
			this.hide();
		}
	}
}

TxtOverlay.prototype.toggleDOM = function () {
	if (this.getMap()) {
		this.setMap(null);
	} else {
		this.setMap(this.map_);
	}
}


var map, zoomSpan, extentsSpan,
	gridParts = [],
	defaults = {
		zoom: 12,
		maxDisplay: 10240,
		geohashPrecision: 12,
		geohashZoomScale: [
		// 00, 01, 02, 03, 04, 05, 06, 07, 08, 09, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24
			1,  1,  2,  2,  2,  3,  3,  3,  4,  4,  4,  5,  5,  5,  6,  6,  6,  7,  7,  7,  8,  8,  8,  9,  9,  9
		]
	};

var drawGrid = _.debounce(_drawGrid, 300);

function initialize() {
	zoomSpan = document.getElementById('zoom');
	extentsSpan = document.getElementById('extents');

	map = new google.maps.Map(document.getElementById('map'), {
		zoom: defaults.zoom,
		center: new google.maps.LatLng(-27.593691984693564, -48.56170233339071),
		panControl: false,
		streetViewControl: false
	});

	updateZoom();
	updateBounds();

	google.maps.event.addListener(map, 'zoom_changed', updateZoom);
	google.maps.event.addListener(map, 'bounds_changed', updateBounds);
}

google.maps.event.addDomListener(window, 'load', initialize);

function updateZoom() {
	zoomSpan.innerHTML =
	map.getZoom() + ' (' + defaults.geohashZoomScale[map.getZoom()] + ')'
}

function updateBounds() {
	extentsSpan.innerHTML = map.getBounds();
	drawGrid();
}

function eraseGrid() {
	for (var i = 0; i < gridParts.length; i++) {
		gridParts[i].setMap(null);

	}
	gridParts.length = 0;
}

function _drawGrid() {
	var level = defaults.geohashZoomScale[map.getZoom()],
		bounds = map.getBounds(),
		ne = bounds.getNorthEast(),
	    sw = bounds.getSouthWest(),
	    neHash = Geohash.encode(ne.lat(), ne.lng(), level),
	    nwHash = Geohash.encode(ne.lat(), sw.lng(), level),
	    swHash = Geohash.encode(sw.lat(), sw.lng(), level),
	    seHash = Geohash.encode(sw.lat(), ne.lng(), level),
	    current = neHash,
	    eastBound = neHash,
	    westBound = nwHash,
	    maxHash = defaults.maxDisplay;

	eraseGrid();
	while (maxHash-- > 0) {
		drawBox(current);
		do {
			current = Geohash.adjacent(current, 'w');
			drawBox(current);
		} while (maxHash-- > 0 && current != westBound);
		if (current == swHash) {
			return;
		}
		westBound = Geohash.adjacent(current, 's');
		current = eastBound = Geohash.adjacent(eastBound, 's');
	}
	alert("defaults.maxDisplay limit reached");
	eraseGrid();
}

function drawBox(hash) {
	var b = Geohash.bounds(hash),
		c = Geohash.decode(hash),
		gb = new google.maps.LatLngBounds(
			new google.maps.LatLng(b.sw.lat, b.sw.lon),
			new google.maps.LatLng(b.ne.lat, b.ne.lon)),
		rect = new google.maps.Rectangle({
			map: map,
			bounds: gb,
			strokeColor: '#3333AA',
			strokeOpacity: 0.8,
			strokeWeight: 1,
			fillColor: '#222222',
			fillOpacity: 0.1
		}),
	    txt = new TxtOverlay(new google.maps.LatLng(c.lat, c.lon), hash, "hashlabel", map);
	gridParts.push(rect);
	gridParts.push(txt);
}
