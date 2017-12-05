/////////////////////////////////////////////////////////////
// Mapbox key
L.mapbox.accessToken = 'pk.eyJ1IjoicmdhdXNoZWxsIiwiYSI6ImNpZjhjOGc2MjFyMXBzNGx6cncyaW1iM3MifQ.064s1SxrDyJopClO9uDYIg';

/////////////////////////////////////////////////////////////
// Global variables
var lnglat;
var oldLayer = "";
var _selection;
var polygons = L.featureGroup();

/////////////////////////////////////////////////////////////////
// Define Custom Icons
var cssIcon = L.divIcon({
	className: 'css-icon'
});

var cssIconSelected = L.divIcon({
	className: 'css-icon-selected'
});

/////////////////////////////////////////////////////////////////
// Set initial map parameters

var markerCluster = new L.markerClusterGroup({ disableClusteringAtZoom: 10 });
var markers = L.featureGroup().on('click', markerOnClick);
var selectedMarkers = L.featureGroup();

var baselayers = {
	Hybrid: L.mapbox.styleLayer('mapbox://styles/mapbox/satellite-streets-v9'),
	Streets: L.mapbox.styleLayer(' mapbox://styles/mapbox/streets-v9')
};

var overlayMaps = {
	"Unclustered Markers": markers,
	"Clustered Markers": markerCluster
};

var map = L.mapbox.map('map', null, {
	maxZoom: 18
}).setView([40.4469, -100.0195], 4);

L.control.layers(baselayers, overlayMaps, { position: 'topright' }).addTo(map);

map.removeLayer(markers);
map.addLayer(markerCluster);
baselayers.Streets.addTo(map);

var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

var drawControl = new L.Control.Draw({
	position: 'topleft',
	draw: {
		polyline: false,
		rectangle: false,
		polygon: {
			shapeOptions: {
				color: 'red'
			},
			allowIntersection: false,
			drawError: {
				color: 'orange',
				timeout: 1000
			},
			showArea: true,
			metric: false,
			repeatMode: true
		},
		circle: false,
		marker: {
			icon: cssIcon
		},
	},
	edit: {
		featureGroup: drawnItems
	}
}).addTo(map);


///////////////////////////////////////////////////////////////////////////////////////
// select features using turf within
map.on('draw:created', function (e) {
	var type = e.layerType,
		layer = e.layer;

	if (type === 'marker') {
		//layer.bindPopup('A popup!');
		markerCluster.addLayer(layer);

		drawnItems.addLayer(layer);
		// also add marker to unclustered feature group
		markers.addLayer(layer);
		lnglat = [e.layer._latlng.lng, e.layer._latlng.lat];

	}

	if (type === 'polygon') {

		polygons.addLayer(layer);
		drawnItems.addLayer(layer);

		//just markers ?
		var data = markers.toGeoJSON();

		var created = polygons.toGeoJSON();

		/////////////////////////////////////
		// turf within only works with pts
		//var data = drawnItems.toGeoJSON();
		var iswithin = turf.within(data, created);

		L.geoJson(iswithin, {
			pointToLayer: function (feature, latlng) {
				return L.marker(latlng, { icon: cssIconSelected });
			}
		}).addTo(map);

		_selection = 'text/json;charset=utf-8,' + encodeURIComponent(
			JSON.stringify(iswithin));
	}


});

//////////////////////////////////////////////////////////////////////////////////////
// Select Markers on click
var count = 0;
function markerOnClick(e) {
	count += 1;
	console.log(count)
	var layer = e.layer;
	if (count % 2 == 0){
		addMarkers(layer)
	}
	else {
		removeMarkers(layer)
	}
}

function addMarkers(layer){
	layer.setIcon(cssIconSelected);
	selectedMarkers.addLayer(layer);
}
function removeMarkers(layer){
	layer.setIcon(cssIcon);
	selectedMarkers.removeLayer(layer);
}

function exportSelected(){
	var selection = selectedMarkers.toGeoJSON();
	_selection = 'text/json;charset=utf-8,' + encodeURIComponent(
		JSON.stringify(selection));
}
///////////////////////////////////////////////////////////////////////////////////////
// calculate destination

$(function () {
	$("#calculate").on('click', function (e) {
		e.preventDefault();
		//$("#upload:hidden").trigger('click');
	});
});


function calculateDestinationFt() {

	//var layers = initial_point.getLayers();
	var bearing = document.getElementById('bearing').value;

	var distance = document.getElementById('distance').value;

	var point = turf.point(lnglat);

	var miles = distance / 5280

	var destination = turf.destination(point, miles, bearing,
		'miles');

	var pob = point.geometry.coordinates;
	var end = destination.geometry.coordinates;
	var line = turf.linestring([
		pob,
		end
	]);

	var mkLine =
		{
			"type": "Feature",
			"properties": {
				"azimuth": bearing,
				"distance": distance
			},
			"geometry": {
				"type": "LineString",
				"coordinates": [pob,
					end]
			}
		}

	var geoLinestring = new L.geoJson(mkLine, {
		color: 'red',
		minZoom: 6
	}).addTo(map);

	geoLinestring.eachLayer(
		function (e) {
			//polylines.addLayer(e);
			drawnItems.addLayer(e);
		});

}


/////////////////////////////////////////////////////////////////////////////////////////
// Upload json

$(function () {
	$("#upload_link").on('click', function (e) {
		e.preventDefault();
		$("#upload:hidden").trigger('click');
	});
});


document.getElementById('upload').addEventListener("change", function (evt) {
	var file = evt.target.files[0], // Read first file for this example.
		reader = new FileReader();

	reader.onload = function (e) {
		var fileText = e.target.result,
			fileData = JSON.parse(fileText),
			group = L.geoJson(fileData, {
				pointToLayer: function (feature, latlng) {
					if (feature.properties.size == "") {
						return new L.CircleMarker(latlng, {
							radius: 10,
							color: '#000',
							weight: 5,
							opacity: 1,
							fillColor: 'yellow',
							fillOpacity: 1
						}).addTo(map);
					}
					else {
						return new L.CircleMarker(latlng, {
							radius: Number(feature.properties.size),
							color: '#000',
							weight: Number(feature.properties.size) * 0.1,
							opacity: 1,
							fillColor: feature.properties.color,
							fillOpacity: 1
						}).addTo(map);
					}
				}
			});

		group.eachLayer(
			function (layer) {
				drawnItems.addLayer(layer);
				markerCluster.addLayer(layer);
				markers.addLayer(layer);

				if (layer.feature.geometry.type == 'LineString') {
					layer.setStyle({ color: 'red' })
				}
			});


		map.fitBounds(group.getBounds());
	}

	reader.readAsText(file);
});

/////////////////////////////////////////////////////////////////////////////////////////
// delete all
document.getElementById('delete').onclick = function (e) {
	drawnItems.clearLayers();
	markerCluster.clearLayers();
	markers.clearLayers();
}

/////////////////////////////////////////////////////////////////////////////////////////
// export all
document.getElementById('export').onclick = function (e) {
	// Extract GeoJson from featureGroup
	var data = drawnItems.toGeoJSON();
	// Stringify the GeoJson
	var convertedData = 'text/json;charset=utf-8,' + encodeURIComponent(
		JSON.stringify(data));
	// Create export
	document.getElementById('export').setAttribute('href', 'data:' +
		convertedData);
	document.getElementById('export').setAttribute('download',
		'data.geojson');
}


/////////////////////////////////////////////////////////////////////////////////////////
// export selected
document.getElementById('export_selected').onclick = function (e) {

	document.getElementById('export_selected').setAttribute('href', 'data:' +
		_selection);
	document.getElementById('export_selected').setAttribute('download',
		'data.geojson');
}