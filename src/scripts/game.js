import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import Player from "./player";
import AssetStore from "./util/AssetStore";
import EnemySpawner from "./enemy_spawner";
import ScoreSystem from "./score_system";

export default class Game {

    constructor( HTMLElement, performanceMode = false ){
        this.clock = new THREE.Clock();
        this.performanceMode = performanceMode;

        // Load files, initialize game, and start animation loop.
        this.assetStore = new AssetStore( ( arg ) => {

            if ( this.assetStore.playerImpactSoundGenerator.play() ){
                this.innitializeGame(HTMLElement);
                this.scene.add( this.assetStore.menu );
                this.animate();
                this.setupEnemySpawner();
                this.setupPlayer();
                this.deltaMultiplier = 0.3 // This is used to slow down and speed up the game. 
                
                this.assetStore.menu.onStartButtonClicked = () => {
                    this.ScoreSystem.restart();
                    this.ScoreSystem.startCounting();
                    this.enemySpawner.projectileGroup.despawnAll(); // Remove all projectiles if any.
                    this.enemySpawner.smallEnemyHandler.startSpawning();
                    this.deltaMultiplier = 0.8; // Bring game speed back to normal.
                }
    
                this.player.onDeath = () => {
                    this.ScoreSystem.stopCounting();
                    this.scene.add( this.assetStore.menu );
                    this.deltaMultiplier = 0.3;
                    this.enemySpawner.killAll();
                };
            } else {
                window.alert(
                    "There was an error while loading the game.\nPlease re-fresh the page to continue."
                );
            }


        });
    }

    innitializeGame(HTMLElement){
        this.HTMLElement = HTMLElement;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color( 0x2b2c3b );

        this.camera = new THREE.PerspectiveCamera(
            75, HTMLElement.clientWidth / HTMLElement.clientHeight, 0.1, 500
            );

        window.scene = this.scene;
        window.menu = this.assetStore.menu;
        window.camera = this.camera;
        window.lookAtBot = (n) => {
            camera.lookAt( arr[n].getWorldPosition().x, arr[n].getWorldPosition().y, arr[n].getWorldPosition().z );
        }
        this.camera.position.set(0, 1.6, 0);
        this.camera.add( this.assetStore.listener ); // Add audio listener to camera.

        // Setup lights
        this.scene.add( new THREE.HemisphereLight( 0xffffff, 0xffffff ) );

        if (!this.performanceMode){
            const light = new THREE.DirectionalLight( 0xffffff );
            light.position.set( 0,0.5,-20 ).normalize();
            this.scene.add(light);
        }

        this.assetStore.enviroment.position.z = -10;
        this.scene.add(this.assetStore.enviroment);

        this.renderer = new THREE.WebGL1Renderer( { antialias: !this.performanceMode } ); //TODO: Make this a toggable setting.
        this.renderer.setPixelRatio( HTMLElement.devicePixelRatio );
        this.renderer.setSize( HTMLElement.clientWidth, HTMLElement.clientHeight );
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.xr.enabled = true;

        HTMLElement.appendChild( this.renderer.domElement );
        HTMLElement.appendChild( VRButton.createButton( this.renderer ) );

        this.ScoreSystem = new ScoreSystem( this.scene, this.assetStore );

        window.addEventListener( 'resize', this.onWindowResize.bind(this) );
    }

    setupEnemySpawner(){
        this.enemySpawner = new EnemySpawner(
            this.assetStore,
            this.ScoreSystem
        );
        this.scene.add(this.enemySpawner.enemyGroup);
        this.scene.add(this.enemySpawner.projectileGroup);
    }

    setupPlayer(){
        this.player = new Player(
            this.scene,
            this.renderer,
            this.assetStore,
            this.enemySpawner.enemyGroup,
            this.camera );
        this.scene.add( this.player.playerProjectileGroup );
    }

    onWindowResize(){
        this.camera.aspect = this.HTMLElement.clientWidth / this.HTMLElement.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize( this.HTMLElement.clientWidth, this.HTMLElement.clientHeight );
    }

    animate(){
        this.renderer.setAnimationLoop( this.tick.bind(this) );
    }

    // Runs once every frame.
    tick(){
        const playerPosition = new THREE.Vector3();
        this.camera.getWorldPosition( playerPosition );

        // Delta multiplier is used to speed up or down the game dynamically.
        const delta = this.clock.getDelta() * this.deltaMultiplier;

        this.player.tick( delta );

        this.enemySpawner.enemyGroup.children.forEach(
            enemy => enemy.tick( delta, playerPosition ) );
        this.enemySpawner.projectileGroup.children.forEach(
            projectile => projectile.tick( delta, playerPosition, this.player ) );

        this.renderer.render( this.scene, this.camera );

    }

}