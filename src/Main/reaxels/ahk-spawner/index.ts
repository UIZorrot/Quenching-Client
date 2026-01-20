const { runInExcutable , absAppRunningPath , absAppStaticsPath } = reaxel_ElectronENV();

export const reaxel_AhkSpawner = reaxel( () => {
	
	const {
		setState ,
		store ,
		mutate ,
	} = createReaxable( {
		ahk : null as cp.ChildProcessWithoutNullStreams ,
	} );
	IpcMainOn( 'ahk' ).on( ( e , data ) => {
		purdy( data , null );
		sendMessageToAhk( JSON.stringify( data ) );
	} );
	IpcMainOn( 'spawn' ).on( ( e , data , reply ) => {
		if( data === 'war3-ahk' ) {
			rtn.spawn();
		}
	} );
	IpcMainOn( 'exit-ahk' ).on( ( e , data , reply ) => {
		rtn.shutdown();
	} );
	
	obsReaction( ( first , disposer ) => {
		if( first ) return;
		const { ahk } = store;
		if( ahk ) {
			ahk.stdout.on( 'data' , ( data ) => {
				const { serverTime } = reaxel_ServerTime();
			} );
		}
	} , () => [
		store.ahk ,
	] );
	
	
	const sendMessageToAhk = function () {
		let opened = false;
		return ( message: string ) => {
			if( opened || !store.ahk ) {
				return;
			}
			opened = true;
			store.ahk.stdin.write( message , () => {
				opened = false;
			} );
		};
	}();
	
	const shutdown = () => {
		const { ahk } = store;
		if( ahk ) {
			
			IPCLogger( 'pid:' , ahk.pid );
			
			ahk.stdin.end( () => {
				ahk.kill();
			} );
			process.kill( ahk.pid );
			ahk.kill();
		}
	};
	
	
	const rtn = {
		shutdown ,
		sendMessageToAhk ,
		spawn() {
			if( !store.ahk ) {
				setState( {
					ahk : spawnWar3AHK( { ahkSpawner_SetState : setState , ahkSpawner_Store : store } ) ,
				} );
				useIpcSend( reaxel_MainProcessHub().mainWindow )( "ahk-cp-status" ).send( true );
			} else {
				console.warn( 'ahk进程已在运行中,不可重复调起多个实例' );
			}
			return store.ahk;
		} ,
	};
	return Object.assign(() => rtn , {
		store,
		setState,
		mutate,
	});
} );

setTimeout( () => {
	
	IPCLogger( path.join( absAppStaticsPath , 'ahk-scripts/war3.ahk' ) );
	
	reaxel_MainProcessHub().observedMainWindow( ( win ) => {
		
		const isDev = process.defaultApp || /node_modules[\\/]electron[\\/]/.test( process.execPath );
		if( isDev ) {
			console.log( "Running in development" );
		} else {
			console.log( "Running in production" );
		}
		
		IPCLogger( isDev ? 'development' : 'production' );
	} );
	
} );

const staticsPath = path.join( app.getAppPath() , '../statics' );

function spawnWar3AHK( { ahkSpawner_SetState , ahkSpawner_Store } ) {
	
	// IPCLogger( 'ahk-path:' , path.join( absAppStaticsPath , runInExcutable ? `ahk-scripts/AutoHotkey64.exe` : `statics/ahk-scripts/AutoHotkey64.exe` ) );
	
	const ahkexe = path.join( absAppStaticsPath , `assets/ahk-scripts/AutoHotkey64.exe` );
	const ahkScriptPath = path.join( absAppStaticsPath , "assets/ahk-scripts/war3.ahk" );
	const ahk = cp.spawn( ahkexe , [ ahkScriptPath ] , {
		stdio : [ 'pipe' , 'pipe' , 'pipe' ] , // 确保 stdin, stdout 和 stderr 都连接
	} );
	
	ahkSpawner_SetState( { ahk } );
	
	ahk.stdin.setDefaultEncoding( 'utf8' ); // 设置编码为字符串
	ahk.stdin.on( 'data' , ( data ) => {
		console.log( 'stdin:data--> ' , data );
	} );
	ahk.stdout.on( 'data' , ( data ) => {
		Buffer.isBuffer( data ) && (
			data = data.toString()
		);
		console.log( 'ahk.stdout-> ' , chalk.green( data ) );
		// const json = JSON.parse( data );
	} );
	ahk.stderr.on( 'error' , ( data ) => {
		console.log( `报错信息:${ data }` );
	} );
	ahk.stderr.on( 'data' , ( data ) => {
		console.log( data );
	} );
	ahk.on( 'error' , ( err ) => {
		console.error( 'Failed to start subprocess.' , err );
		IPCLogger( `'Failed to start subprocess.', ${ err }` );
	} );
	ahk.on( 'close' , ( e ) => {
		useIpcSend( reaxel_MainProcessHub().mainWindow )( "ahk-cp-status" ).send( false );
		IPCLogger( `'child_process-closed with code: ', ${ e }` );
		ahkSpawner_SetState( { ahk : null } );
		console.log( chalk.green('war3.ahk exited') );
	} );
	return ahk;
}

type MessageTypes =
//传输数据
	| "transfer"
	//停止ahk进程
	| "stop";


import { IpcMainOn , useIpcSend , IpcMainHandle } from '#main/utils/useIPC';
import { reaxel_MainProcessHub } from '#main/reaxels/main-process-hub';
import { IPCLogger } from '#main/utils/devtools-logger';
import { reaxel_ServerTime } from '#main/reaxels/server-time';
import { reaxel_ElectronENV } from '#main/reaxels/runtime-paths';
// import { mainWindowLoaded } from '#project/src/Main/mainWindow-loaded-promise';
import { ipcRenderer , app } from 'electron';
import path , {} from 'path';
import process from 'node:process';
import cp , {} from 'node:child_process';
import purdy from 'purdy';
import chalk from 'chalk';
