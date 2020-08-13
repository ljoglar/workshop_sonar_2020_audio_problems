import { EssentiaWASM } from '/extractors/saturation/essentia-custom-extractor.module.js';

let App = {};
App.audioCtx = null
App.audioBuffer = null
App.leftChannel = null
App.canvas = null
App.essentia = null
App.saturationExtractor = null
App.saturationResults = {'starts': null, 'ends': null}
App.startStopCutResults = { 'startCut': 0, 'stopCut': 0 }

App.init = function () {
    console.log('Initializing App...');
    this.options = {...this.options, ...options};
    this.loadEvents();
}

App.loadEvents = function() {
    document.addEventListener('click', this.createAudioContext.bind(this));
}

App.createAudioContext = async function(){
    console.log('Creating AudioContext...');
    // If it exists, do not create it again
    if (this.audioCtx !== null) {
        return;
    }
    let contextClass = (window.AudioContext ||
        window.webkitAudioContext ||
        window.mozAudioContext ||
        window.oAudioContext ||
        window.msAudioContext);
    if (contextClass) {
        this.audioCtx = new contextClass();
        console.log(this.audioCtx);
        this.audioBuffer = await this.loadAudioTrack()
        this.leftChannel = this.audioBuffer.getChannelData(0);
        this.createCanvas(this.options.canvasWidth, this.options.canvasHeight);
        requestAnimationFrame(this.draw.bind(this));
        this.loadEssentia();
    } else {
        alert('Your browser does not support web audio api');
    }
}

App.loadAudioTrack = async function() {
    const response = await fetch(this.options.audioURL);
    const arrayBuffer = await response.arrayBuffer();
    return await this.audioCtx.decodeAudioData(arrayBuffer);
}

App.loadEssentia = function(){
    EssentiaModule().then( (EssentiaWasmModule)=> {
        this.essentia = new Essentia(EssentiaWasmModule);
        this.computeStartStopCut();
    });
    this.loadSaturationExtractor();
}

App.loadSaturationExtractor = function(){
    // create a instance of our custom 'SaturationDetectorExtractor'
    // by passing our configuration settings for the given parameters
    this.saturationExtractor = new EssentiaWASM.SaturationDetectorExtractor(1024, 512);
    console.log(this.saturationExtractor);
    this.computeSaturation();
}

App.computeSaturation = function() {
    this.saturationResults['starts'] = this.saturationExtractor.computeStarts(this.leftChannel);
    this.saturationResults['ends'] = this.saturationExtractor.computeEnds(this.leftChannel);
}

App.drawSaturationStart = function(){
    for (let i = 0; i < this.saturationResults['starts'].size(); i ++){
        let samplePixel = this.saturationResults['starts'].get(i) * 44100 * this.options.canvasWidth / this.leftChannel.length;
        this.drawLine(samplePixel, 'red');
    }
}

App.computeStartStopCut = function(){
    this.startStopCutResults = this.essentia.StartStopCut(this.essentia.arrayToVector(this.leftChannel));
    console.log('startStopCutResults');
    console.log(this.startStopCutResults);
}

App.drawStartStopCut = function(){
    if (this.startStopCutResults.startCut === 1){
        for (const x of Array(5).keys()) {
            this.drawLine(x, 'blue');
        }
    }
    if (this.startStopCutResults.stopCut === 1){
        for (const x of Array(5).keys()) {
            this.drawLine(this.options.canvasWidth - x, 'blue');
        }
    }
}


App.createCanvas = function(w,h) {
    console.log('Creating Canvas...');
    // If canvas exist do not create again
    if (this.canvas) {
        return;
    }

    let newCanvas = document.createElement('canvas');
    newCanvas.width = w;
    newCanvas.height = h;

    document.getElementById('loadText').replaceWith(newCanvas);
    this.canvas = newCanvas.getContext('2d');
}

App.displayTrack = function() {
    this.canvas.save();
    this.canvas.fillStyle = '#080808' ;
    this.canvas.fillRect(0,0,this.options.canvasWidth,this.options.canvasHeight );
    this.canvas.strokeStyle = '#46a0ba';
    this.canvas.globalCompositeOperation = 'lighter';
    this.canvas.translate(0,this.options.canvasHeight / 2);
    this.canvas.lineWidth=1;
    let totalLength = this.leftChannel.length;
    let eachBlock = Math.floor(totalLength / this.options.drawLines);
    let lineGap = (this.options.canvasWidth/this.options.drawLines);

    this.canvas.beginPath();

    for (let i=0; i<=this.options.drawLines; i++) {
        let audioBuffKey = Math.floor(eachBlock * i);
        let x = i*lineGap;
        let y = this.leftChannel[audioBuffKey] * this.options.canvasHeight / 2;
        this.canvas.moveTo( x, y );
        this.canvas.lineTo( x, (y*-1) );
    }
    this.canvas.stroke();
}

App.drawLine = function (currentTime, color){
    this.canvas.beginPath();
    this.canvas.moveTo(currentTime, this.options.canvasHeight);
    this.canvas.lineTo(currentTime, -1*this.options.canvasHeight);
    this.canvas.strokeStyle = color;
    this.canvas.stroke();
}

App.draw = function (){
    this.canvas.clearRect(0, 0, this.options.canvasWidth, this.options.canvasHeight);
    this.displayTrack();
    if(this.saturationResults['starts'].size() > 0){
        this.drawSaturationStart();
    }
    if(this.startStopCutResults.startCut > 0 || this.startStopCutResults.stopCut > 0){
        this.drawStartStopCut();
    }
    this.canvas.restore();

    requestAnimationFrame(this.draw.bind(this));
}

window.App = App || {};
let options = {
    canvasWidth: document.body.offsetWidth,
    canvasHeight: 300,
    drawLines: 2000,
    audioURL: 'audio/song_saturation_and_end_cut.wav',
};

App.init(options)
