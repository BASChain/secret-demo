'use strict';

const C = {
  "REBUILD":"npm run rebuild",
  "buildMode":"zip"
}

/**
 * ENV config like this
 * REMOTE_HOST=xx.x.x.x
 * REMOTE_PORT=22
 * REMOTE_USER=root
 * REMOTE_DEST_HOME=/opt/nginx
 * REMOTE_DEST_WWW=/opt/nginx/www
 * SSH_KEY=vultr_nbs
 */
const os = require('os');
const Version = require('../package.json').version;
const APP_NAME = require('../package.json').name || 'bighugi';
const fs = require('fs');
const path = require('path');
const shell = require('shelljs');
const zip = require('bestzip');
const DateFormat = require('fast-date-format');

const dfTS = new DateFormat('YYYY-MM-DD HH:mm:ss.SSS');
const dfYMD = new DateFormat('YYYYMMDD');

let IEnv = {
  "REMOTE_ENABLE":false,
  "TMP_DEST":"tmp",
  "DEST":"dist",
  "LOG_DEST":"log",
  "REMOTE_DEST_HOME":"/data",
};

IEnv.BASE_DIR = process.cwd();

let envPath = path.resolve(path.join(process.cwd(),'.config'),'.env');
console.log('envPath',envPath);

var oEnv = require('dotenv').config({path:envPath,encoding:'utf8'});

if(oEnv.error){
  console.log("Load env Error:",oEnv.error);
  process.exit(1);
}else{
  //console.log('oEnv',JSON.stringify(oEnv.parsed,null,' '));
}

IEnv = Object.assign({},IEnv,oEnv.parsed);
preparedIEnv();
console.log("IENV",JSON.stringify(IEnv,null,'  '));
copyFiles();


/* ======================== Methods =================================  */
function preparedIEnv() {
  //ssh key
  if(typeof IEnv['SSH_KEY'] === 'string'){
    let ssh_home = process.env['HOME'] || process.env['USERPROFILE'];   
    ssh_home = path.join(ssh_home,'.ssh');
    //console.log('ssh',ssh_home );

    let sshKey = path.resolve(ssh_home,IEnv['SSH_KEY']);

    // if(os.type()=='Windows_NT'){
    //   sshKey = sshKey.replace(/\\|\:\\/g,'/');
    //   sshKey = '/'+sshKey;
    // }

    //console.log('sshKey',sshKey);
    if(shell.find(sshKey).length >0){
      IEnv['SSH_KEY_PATH']=sshKey;
      IEnv['REMOTE_ENABLE'] = true;
    }else{
      IEnv['REMOTE_ENABLE'] = false;
    }
  }else{
    IEnv['REMOTE_ENABLE'] = false;
  }

  let now = new Date();
  IEnv['PUBLISH_FOLDER'] = comboName(APP_NAME,Version,dfYMD.format(now));
  IEnv['PUBLISH_ZIP'] = comboName(APP_NAME,Version,'.zip');
  //clean mkdirs
  
  let rmDirs = [
    path.join(IEnv.DEST,IEnv.PUBLISH_ZIP),
    path.join(IEnv.DEST,IEnv.PUBLISH_FOLDER),
    IEnv.TMP_DEST
  ];

  shell.rm('-rf',rmDirs);
  shell.mkdir(IEnv.TMP_DEST,IEnv.DEST);
}

function copyFiles(){
  var child = shell.exec(C.REBUILD).stdout;

  shell.cp('-Rf','public/*','build/*',IEnv.TMP_DEST+'/');

  if(C.buildMode === 'zip'){
    zipDest();
  }else{
    let destPath = path.join(IEnv.DEST,IEnv.PUBLISH_FOLDER);
    shell.cp('-R',IEnv.TMP_DEST,destPath);
  }

}

function zipDest(){
  shell.cd(IEnv.TMP_DEST);

  let opt = {
    source:'*',
    destination:path.join(IEnv.BASE_DIR,IEnv.DEST,IEnv.PUBLISH_ZIP)
  };

  zip(opt).then(function(){
    console.log('Zip Completed.');
    
    shell.cd(IEnv.BASE_DIR);
  }).catch(err=>{
    console.log('Error:',err.message);
    shell.cd(IEnv.BASE_DIR);
  });
}


function comboName(preffix,version,suffix){
  let name = preffix + '-v'+version;

  if(suffix){
    if(suffix.startsWith('.')){
      name += suffix;
    }else{
      name += '-'+suffix;
    }
  }
  return name;
}
