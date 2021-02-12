/* Jose Miralles, this loads all assets from a single .glb file */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

import assets from "../../../meshes/assets.glb";
import shot from "../../../audio/shot.mp3";
import botImpact from "../../../audio/botImpact.mp3";

export default class AssetStore {

    constructor( assetsLoadedCallback ){

        this.listener = new THREE.AudioListener();
        this.assetsLoadedCallback = assetsLoadedCallback;

        this.load3DAssets();
    }

    load3DAssets(){

        const gltfloader = new GLTFLoader();
        gltfloader.load("/dist/" + assets, (model) => {
            this.pistolModel = model.scenes[0].children[0];
            this.robot1 = model.scenes[0].children[1];
            this.enviroment = model.scenes[0].children[3];
            this.shotModel = model.scenes[0].children[2];
            this.shotModel.material = new THREE.MeshLambertMaterial
                ({ emissive: 0xfbff00, color: 0xfbff00 });

            this.loadAudioFiles();
        });

    }

    loadAudioFiles(){
        const audioLoader = new THREE.AudioLoader();

        const filesToLoad = [
            {
                path: shot,
                key: "shotSoundGenerator",
                audioClass: THREE.Audio,
                numberOfAudios: 30,
                volume: 0.3
            },
            { 
                path: botImpact,
                key: "botImpactSoundGenerator",
                audioClass: THREE.Audio,
                numberOfAudios: 20,
                volume: 1
            }
        ];

        filesToLoad.forEach( ( params, i ) =>
            audioLoader.load ("/dist/" + params.path, (buffer) => {
                this[params.key] = new SoundGenerator(
                    buffer, this.listener, params.numberOfAudios, params.audioClass, params.volume
                );
                
                // Notify that all assets are loaded after the last sound is loaded.
                if ( i === filesToLoad.length - 1 )
                    this.assetsLoadedCallback();
            }));
    }

}

class SoundGenerator {

    constructor( buffer, listener, numberOfAudios, audioClass, volume ){
        this.array = new Array( numberOfAudios );
        this.pos = 0;
        this.populateArray( buffer, listener, audioClass, volume );
    }

    play(){
        this.array[this.pos].play();
        this.pos ++;
        if ( this.pos > this.array.length - 1 ) this.pos = 0;
    }

    populateArray( buffer, listener, audioClass, volume ){
        for (let i = 0; i < this.array.length; i++) {
            const audio = new audioClass( listener );
            audio.setBuffer(buffer);
            audio.setVolume( volume );
            this.array[i] = audio;
        };
    }

}