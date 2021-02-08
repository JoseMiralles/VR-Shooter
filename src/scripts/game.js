import * as THREE from "three";
import { VRButton } from "./plugins/VRButton";
import { GLTFLoader } from "./plugins/GLTFLoader";

export default class Game {

    constructor( HTMLElement ){
        this.camera = null;
        this.controller1 = null;
        this.controller2 = null;
        this.controllerGrip1 = null;
        this.controllerGrip2 = null;
        this.scene = null;
        this.renderer = null;
        this.room = null;
        
        this.radius = 0.08
        this.normal = new THREE.Vector3();
        this.relativeVelocity = new THREE.Vector3();
        this.bulletGeometry = new THREE.IcosahedronGeometry( this.radius, 3 );
        

        this.clock = new THREE.Clock();

        this.innitializeGame(HTMLElement);
    }

    start(){

    }

    innitializeGame(HTMLElement){
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color( 0x1f1f1f );

        this.camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0., 10 );
        this.camera.position.set(0, 1.6, 3);

        // TODO: switch to a better enviroment.
        this.room = new THREE.LineSegments(
            new THREE.BoxGeometry( 6, 6, 6, 10, 10, 10 ),
            new THREE.LineBasicMaterial( { color: 0xc71717 } )
        );
        this.room.geometry.translate(0, 3, 0);
        this.scene.add( this.room );

        // Setup lights
        this.scene.add( new THREE.HemisphereLight( 0x606060, 0x404040 ) );

        const light = new THREE.DirectionalLight( 0xffffff  );
        light.position.set( 1,1,1 ).normalize();
        this.scene.add(light);

        this.renderer = new THREE.WebGL1Renderer( { antialias: true } ); //TODO: test performance without antialiasing.
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.xr.enabled = true;

        HTMLElement.appendChild( this.renderer.domElement );
        HTMLElement.appendChild( VRButton.createButton( this.renderer ) );

        // Setup controllers and listeners.
        this.controller1 = this.renderer.xr.getController(0);
        this.controller1.addEventListener( "selectstart", this.onSelectStart );
        this.controller1.addEventListener( "selectend", this.onSelectEnd );
        this.controller1.addEventListener( "connected", function(e){
            this.add( buildController( e.data ) );
        });
        this.controller1.addEventListener( "disconnected", function(e){
            this.remove( this.children[0] );
        });
        this.scene.add( this.controller1 );
        
        this.controller2 = this.renderer.xr.getController(1);
        this.controller2.addEventListener( "selectstart", this.onSelectStart );
        this.controller2.addEventListener( "selectend", this.onSelectEnd );
        this.controller2.addEventListener( "connected", function(e){
            this.add( buildController( e.data ) );
        });
        this.controller2.addEventListener( "disconnected", function(e){
            this.remove( this.children[0] );
        });
        this.scene.add( this.controller2 );

        const loader = new GLTFLoader();
        loader.load(require("../../meshes/pistol_mesh.glb"), ( pistolModel ) => {
            this.controllerGrip1 = this.renderer.xr.getControllerGrip(0);
            this.controllerGrip2 = this.renderer.xr.getControllerGrip(1);

            this.controllerGrip1.add( pistolModel );
            this.controllerGrip2.add( pistolModel );
        });

        window.addEventListener( 'resize', this.onWindowResize );
    }

    onSelectStart(){
        this.userData.isSelecting = true;
    }

    onSelectEnd(){
        this.userData.isSelecting = false;
    }

    buildController( data ){
        let geometry, amterial;

        switch( data.targetRayMode ){

            case "tracked-pointer":
                geometry = new THREE.BufferGeometry();
                geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( [ 0, 0, 0, 0, 0, - 1 ], 3 ) );
                geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( [ 0.5, 0.5, 0.5, 0, 0, 0 ], 3 ) );
                material = new THREE.LineBasicMaterial( { vertexColors: true, blending: THREE.AdditiveBlending } );
                return new THREE.Line( geometry, material );

            case "gaze":
                geometry = new THREE.RingGeometry( 0.02, 0.04, 32 ).translate( 0, 0, - 1 );
                material = new THREE.MeshBasicMaterial( { opacity: 0.5, transparent: true } );
                return new THREE.Mesh( geometry, material );

        }
    }

    onWindowResize(){
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize( window.innerWidth, window.innerHeight );
    }

    // Gets called once every frame / render loop.
    handleController( controller ){

        if ( controller.userData.isSelecting ){
            const bullet = new THREE.Mesh( this.bulletGeometry,
                new THREE.MeshLambertMaterial( { color: 0x00adff } ));

            // set initial bullet position relative to the controller.
            bullet.position.copy( controller.position );

            bullet.userData.velocity = new THREE.Vector3();
            bullet.userData.velocity.x = Math.random() * 0.01 - 0.005;
            bullet.userData.velocity.y = Math.random() * 0.01 - 0.005;
            bullet.userData.velocity.z = Math.random() * 0.01 - 0.005;

            // Set bullet direction relative to the controller direction.
            bullet.userData.velocity.applyQuarternion( controller.quarterion );

            this.room.add( bullet );
        }
    }

    animate(){
        this.renderer.setAnimationLoop( this.render );
    }

    render(){

        this.handleController( this.controller1 );
        this.handleController( this.controller2 );

        // * 0.8 slows down the simulation.
        const delta = this.clock.getDelta() * 0.8;

        const range = 3 - this.radius;

        this.renderer.render( scene, camera );

    }

}