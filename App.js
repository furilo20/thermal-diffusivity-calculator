import React, { useState, useEffect} from 'react';
import { StyleSheet, ScrollView, Text, View, TouchableOpacity, 
  Image, Modal, TextInput, Alert, NativeEventEmitter, NativeModules, 
  Platform, PermissionsAndroid, FlatList,
  TouchableHighlight, } from 'react-native';    // MIT https://github.com/facebook/react-native
import BleManager from 'react-native-ble-manager'; // Apache 2.0  https://github.com/innoveit/react-native-ble-manager 
import { stringToBytes } from "convert-string";  // MIT eu acho
import TimeLineChart from './src/component/TimeLineChart' ;
import XLSX from 'xlsx';

const RNFS = require('react-native-fs');
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

export default function App(){
  const [modalHistorico, setModalHistorico] = useState(false);
  const [modalNovaMedicao, setModalNovaMedicao] = useState(false);
  const [modalCalibracao, setModalCalibracao] = useState(false);
  const [modalBluetooth, setModalBluetooth] = useState(false);
  const [modalAtual, setModalAtual] = useState(false);
  const [modalAntigo, setModalAntigo] = useState(false);
  const [atualInativo, setAtualInativo] = useState(true);
  const [tempeInicial, setTempeInicial] = useState('');
  const [tempFinal, setTempFinal] = useState('');
  const [tempo, setTempo] = useState('');
  const [inicio, setInicio] = useState('');
  const [terminou, setTerminou] = useState(false);
  const [tempoAtual, setTempoAtual] = useState('');
  const [temperaturaAgua, setTemperaturaAgua] = useState('');
  const [temperaturaAlimento, setTemperaturaAlimento] = useState('');
  const [tempe1, setTempe1] = useState();
  const [tempe2, setTempe2] = useState();
  // const [lastT, setLastT] = useState(-1);
  const [datagrafic1, setDatagrafic1] = useState([]);
  const [datagrafic2, setDatagrafic2] = useState([]);
  const [data1antiga, setData1antiga] = useState([]);
  const [data2antiga, setData2antiga] = useState([]);
  const [datasheet, setDatasheet] = useState([]);
  const [calibrarT1, setCalibrarT1] = useState();
  const [calibrarT2, setCalibrarT2] = useState();
  const [erroT1, setErroT1] = useState();
  const [erroT2, setErroT2] = useState();
  const [isScanning, setIsScanning] = useState(false);
  const [list, setList] = useState([]);
  const [historic, setHistoric] = useState([]);
  const [nExp, setNExp] = useState([]);
  const peripherals = new Map();
  // BLE caracteristicas
  const ThermometerService  = "ab0828b1-198e-4351-b779-901fa0e0371e";
  const controleTXCharacteristic  = "4ac8a682-9736-4e5d-932b-e9b31405049c";
  const fbTXCharacteristic  = "5ac8a682-9736-4e5d-932b-e9b31405049c";
  const RXCharacteristic  = "0972EF8C-7613-4075-AD52-756F33D4DA91";
  
  const Diretorio = RNFS.DownloadDirectoryPath+'/MeDifusiFiles';
  //variaveis para o grafico
  var datagraphic1 = [];
  var datagraphic2 = [];
  var datasheets = [];
  // var lastT = -1;
  var dhist1=[], dhist2=[];
  // var datasheets = [];
  
  // funcionamento dos modais
  const inAtual = () => {
    setModalNovaMedicao(false);
    setModalAtual(true);
    //mudar depois, atualInativo apenas quando rodar e desligar quando acabar
    setAtualInativo(false);
  }
  const outAtual = () => {
    setModalAtual(false);
  }
  const inNovaMedicao = () => {
    setModalNovaMedicao(true);
  }
  const outNovaMedicao = () => {
    setModalNovaMedicao(false);
  }
  const inHistorico = () => {
    dhist1=[]; 
    dhist2=[];
    importDir(RNFS.DownloadDirectoryPath);
    setModalHistorico(true);
  }
  const outHistorico = () => {
    setModalHistorico(false);
  }
  const inBluetooth = () => {
    setModalBluetooth(true);
  }
  const outBluetooth = () => {
    setModalBluetooth(false);
  }
  const inCalibracao = () => {
    renderWrite(peripherals, controleTXCharacteristic, 'CA');
    setModalCalibracao(true);
  }
  const outCalibracao = () => {
    renderWrite(peripherals, controleTXCharacteristic, 'EXIT');
    setModalCalibracao(false);
  }
  const inAntigo = () => {
    setModalAntigo(true);
  }
  const outAntigo = () => {
    setModalAntigo(false);
  }
  
  

  // Scan
  const startScan = () => {
    if(!isScanning){
      BleManager.scan([], 3, true).then((results) => {
        console.log('Scanning...');
        setIsScanning(true);
      }).catch(err => {
        console.error(err);
      });
    }
  }
  // stop scan
  const handleStopScan = () => {
    console.log('Scan is stopped');
    setIsScanning(false);
  }
  // disconnect peripheral
  const handleDisconnectedPeripheral = (data) => {
    let peripheral = peripherals.get(data.peripheral);
    if (peripheral) {
      peripheral.connected = false;
      peripherals.set(peripheral.id, peripheral);
      setList(Array.from(peripherals.values()));
    }
    console.log('Disconnected from ' + data.peripheral);
  }
  //update value for characteristic
  var contador = 0;
  // const handleUpdateValueForCharacteristic = (data) => {
  async function handleUpdateValueForCharacteristic (data) {
    
    // console.log('Received data from ' + data.peripheral + ' characteristic ' + data.characteristic, data.value);
    let j = data.value.length;
    let valor = "";
    let aux=1;
    let t='', t0 ='', t1='', t2='', cat1='', cat2='';
    for(let i=2; i<j; i++){
      valor = valor + String.fromCharCode(data.value[i]);
      switch(String.fromCharCode(data.value[0])){
        case 'I':
          if(String.fromCharCode(data.value[i])!=' '){
            t0 = t0 + String.fromCharCode(data.value[i]);
          }
          break;

        case 'C':
          // recebendo data
          if(String.fromCharCode(data.value[i])==' ' ){
            aux++;
          }else if(aux == 1){
            cat1 = cat1 + String.fromCharCode(data.value[i]);
          }else if(aux == 2){
            cat2 = cat2 + String.fromCharCode(data.value[i]);
          }
          break;

        case 'D':
          // recebendo data
          if(String.fromCharCode(data.value[i])==' ' ){
            aux++;
          }else if(aux == 1){
            t1 = t1 + String.fromCharCode(data.value[i]);
          }else if(aux == 2){
            t2 = t2 + String.fromCharCode(data.value[i]);
          }else if(aux == 3){
            t = t + String.fromCharCode(data.value[i]);
          }
          break;

        case 'F':
          // ultimo dado, finalizar e montar o grafico.
          setTerminou(true);
          break;

        default:
          console.log("lixo");
          break;       
      }
      
    }
    //separaçao pra diferenciar a saida
    switch(String.fromCharCode(data.value[0])){
      case 'I':
        console.log('dado inicial recebido');
        console.log(t0);
        setTempeInicial(t0);
        lastT = -1;
        datagraphic1=[];
        datagraphic2=[];
        break;

      case 'C':
        // recebendo data
        cat1 = Number(cat1);
        cat2 = Number(cat2);
        console.log(cat1);
        console.log(cat2);
        setCalibrarT1(cat1);
        setCalibrarT2(cat2);
        break;

      case 'D':
        // let resposta; 
        t = Number(t);
        t1 = Number(t1);
        t2 = Number(t2);
        console.log('tempo: ' + t);
        // console.log('LastTempo: ' + lastT);
        // if(lastT<t){
        console.log('dado inteiro');
        console.log(valor);
        setTempoAtual(t);
        setTemperaturaAgua(t1);
        setTemperaturaAlimento(t2);
        datagraphic1 = [...datagraphic1,{x: t,y: t1}];
        datagraphic2 = [...datagraphic2,{x: t,y: t2}];
        datasheets = [...datasheets,{ t:t, s1:t1, s2:t2}];
        setDatasheet(datasheets);
        setTempe1(datagraphic1);
        setTempe2(datagraphic2);
        contador++;
        if(contador==4){
          
          // setTerminou(false);
          ()=>renderGraphic(tempe1,tempe2);
        }else if(contador>=5){
          // atualizar grafico
          ()=>renderGraphic(tempe1,tempe2);
          contador=0;
        }
        console.log('contador: '+contador);
          // resposta = 'R ' + t;
          // setLastT(t);
          // lastT = t;
          // renderWrite(peripherals, fbTXCharacteristic, resposta);
        // }else{
        //   resposta = 'R ' + lastT; 
        //   console.log('dado já recebido enviando confirmaçao');
        //   renderWrite(peripherals, fbTXCharacteristic, resposta);
        // }
        break;

      case 'F':
        // ultimo dado, finalizar e montar o grafico.
        setTerminou(true);
        break;   
      default:
        console.log('lixo');
        break;     
    }
  }

  // retrieve connected - retorna conectados
  const retrieveConnected = () => {
    BleManager.getConnectedPeripherals([]).then((results) => {
      if(results.length == 0){
        console.log('No connected peripherals');
      }
      console.log(results);
      for (var i = 0; i < results.length; i++){
        var peripheral = results[i];
        peripheral.connected = true;
        peripherals.set(peripheral.id, peripheral);
        setList(Array.from(peripherals.values()));
      }
    });
  }
  // discover peripherals
  const handleDiscoverPeripheral = (peripheral) => {
    console.log('Got ble peripheral', peripheral);
    if (!peripheral.name) {
      peripheral.name = "NO NAME";
    }
    peripherals.set(peripheral.id, peripheral);
    setList(Array.from(peripherals.values()));
  }
  // test peripheral
  const testPeripheral = (peripheral) => {
    if(peripheral){
      if(peripheral.connected){
        BleManager.disconnect(peripheral.id);
      }else{
        BleManager.connect(peripheral.id).then(() => {
          let p = peripherals.get(peripheral.id);
          if (p) {
            p.connected =true;
            peripherals.set(peripherals.id, p);
            setList(Array.from(peripherals.values()));
          }
          console.log('Connected to ' + peripheral.id);

          setTimeout(() => {
            // test read current RSSI value
            BleManager.retrieveServices(peripheral.id).then((peripheralInfo) => {
              console.log('Retrieved peripheral services', peripheralInfo);

              BleManager.readRSSI(peripheral.id).then((rssi) => {
                console.log('Retrieved actual RSSI value', rssi);
                let p = peripherals.get(peripheral.id);
                if (p) {
                  p.rssi = rssi;
                  peripherals.set(peripheral.id, p);
                  setList(Array.from(peripherals.values()));
                }
              });
            });
            
            BleManager.retrieveServices(peripheral.id).then((peripheralInfo) => {
              console.log(peripheralInfo);
              BleManager.startNotification(peripheral.id, ThermometerService, RXCharacteristic).then((dados) =>{
                console.log('read data: ' + dados);
              }).catch((error) =>{
                console.log('Reading error', error);
              });

              
            });
          }, 900);
        }).catch((error) => {
          console.log('Connected error', error);
        });
      }
    }
  }
  
  // useEffect
  useEffect(() => {
    RNFS.mkdir(RNFS.DownloadDirectoryPath+'/MeDifusiFiles');
    BleManager.start({showAlert: true});

    bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral);
    bleManagerEmitter.addListener('BleManagerStopScan', handleStopScan);
    bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', handleDisconnectedPeripheral);
    bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', handleUpdateValueForCharacteristic);
    bleManagerEmitter.addListener('BleManagerWriteCharacteristic', renderWrite);

    if(Platform.OS === 'android' && Platform.Version >= 23){
      PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION).then((result) => {
        if(result){
          console.log('Permission is OK');
        } else {
          PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION).then((result) => {
            if(result){
              console.log('User accept');
            }else{
              console.log('User refuse');
            }
          });
        }
      })
    }

    return(() => {
      console.log('unmount');
      bleManagerEmitter.removeListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral);
      bleManagerEmitter.removeListener('BleManagerStopScan', handleStopScan );
      bleManagerEmitter.removeListener('BleManagerDisconnectPeripheral', handleDisconnectedPeripheral );
      bleManagerEmitter.removeListener('BleManagerDidUpdateValueForCharacteristic', handleUpdateValueForCharacteristic );
      bleManagerEmitter.removeListener('BleManagerWriteCharacteristic', renderWrite);
      // bleManagerEmitter.removeAllListeners('BleManagerWriteCharacteristic', renderWrite);
    })
  }, []);

  // render bluetooth itens
  const renderItem = (item) => {
    const color = item.connected ? '#00ff55' : '#ee8f00';
    return(
      <TouchableHighlight onPress={() => testPeripheral(item)} style={{height:100 ,width:300,margin:10,padding:0,borderRadius:50,borderColor:color, borderWidth:20}} >
        <View style={[styles.row, {backgroundColor: color}]}>
          <Text style={{fontSize: 12, textAlign: 'center', color: '#333333', padding: 10}}>{item.name}</Text>
          <Text style={{fontSize: 10, textAlign: 'center', color: '#333333', padding: 2}}>{item.rssi}</Text>
          <Text style={{fontSize: 8, textAlign: 'center', color: '#333333', padding: 2}}>{item.id}</Text>
        </View>
      </TouchableHighlight>
    );
  }

  // escrever controleTXCharacteristic
  const renderWrite = (peripheral,caracteristica, command) => {
    setTimeout(() =>{
      // const data = stringToBytes(tempFinal);
      const data = stringToBytes(command);
      BleManager.getConnectedPeripherals([]).then((results) => {
        if(results.length == 0){
          console.log('No connected peripherals');
        }
        // console.log(results);
        for (var i = 0; i < results.length; i++){
          var peripheral = results[i];
          peripheral.connected = true;
          peripherals.set(peripheral.id, peripheral);
          setList(Array.from(peripherals.values()));
        }
        BleManager.retrieveServices(peripheral.id).then(() => {
            BleManager.write(peripheral.id, ThermometerService, caracteristica, data).then(() => {
              console.log('Writing: ' + command); 
            }).catch((error) => {
              console.log('Write error', error);
            });
        }).catch((error) => {
          console.log('Retrieve Services error', error);
        });
      });
    }, 200);
  }

  function renderGraphic(tempe1,tempe2) {
    console.log('grafico');
    // setTerminou(false); 
    if(terminou === true){
      console.log('fechou grafico');
      // setDatagrafic1 (tempe1) ;
      // setDatagrafic2 (tempe2);
      setTerminou(false);
    }else if(terminou === false){
      console.log('abriu grafico');
      setDatagrafic1 (tempe1) ;
      setDatagrafic2 (tempe2);
      // console.log(datagrafic1);
      // console.log(datagrafic2);
      setTerminou(true);
    }
  }

  // Aplicar erro nos termopares
  function aplicarErro(){
    let erroS = 'E ' + Number(erroT1).toFixed(3) + ' ' + Number(erroT2).toFixed(3);
    renderWrite(peripherals, controleTXCharacteristic , erroS );
    outCalibracao();
  }

  // Verifica se pode começar
  function comecar(){
    let time = tempo;
    let tempeFinal = tempFinal;
    if (time > 0 && tempeFinal >= 33) {
      setInicio (tempo + ' ' + tempFinal);
      // Zerar os tempes quando inciar um novo
      datagraphic1 = [];
      datagraphic2 = [];
      datasheets = [];
      contador=0;
      let sl = 0;
      // setLastT(-1);
      lastT= -1;
      setDatasheet(datasheets);
      setTempe1(datagraphic1);              
      setTempe2(datagraphic2);
      console.log('reset variaveis');
      console.log('LastT: ',+lastT);
      console.log('datasheets: ',+datasheet);
      console.log('datagraphic1: ',+tempe1);
      console.log('datagraphic2: ',+tempe2);

      
      // console.log('tempe inicio');
      // console.log(tempe1);
      let auxEnvio = "start " + tempFinal + " " + tempo;
      inAtual();
      renderWrite(peripherals, controleTXCharacteristic, auxEnvio ); //colocar depois os dados parar iniciar
      console.log('abriu');
    }
    else{
      Alert.alert('Atenção','Por favor tempo maior que zero e temperatura final acima da ambiente',[
        {text: 'Entendido', onPress:() => console.log('alert closed')}
      ]);
    }
  }

  // Export dados
  const exportData = () => {
    Alert.alert(
      "Exportando arquivo para  /Downloads/MeDifusiFiles",
      "Preencha com o nome do arquivo a ser exportado:",
      [
        {
          text: "Cancel",
          onPress: () => console.log("Cancel Pressed"),
          style: "cancel"
        },
        {
          text: "OK",
          input: (value) => (value),
          onPress: value => console.log("OK Pressed, password: " + value)
        }
        //{ text: "OK", onPress: () => console.log("OK Pressed") }
      ]
    );
    RNFS.readDir(Diretorio).then(files =>{
      let auxiliar;
      auxiliar = Number(Number(files.length) + 1)
      setNExp(auxiliar);
      console.log(nExp);
      
    }).catch(err=>{
      console.log(err.message,err.code);
    })
    console.log("numero do experimento");
    console.log(nExp);
    let nome = '/Experimento-'+nExp+'.xlsx';
    let book = XLSX.utils.book_new();
    console.log(datasheet);
    let sheet = XLSX.utils.json_to_sheet(datasheet);
    XLSX.utils.book_append_sheet(book,sheet,"Users");
    const sconf = XLSX.write(book, {type:'binary', bookType:'xlsx'});
    RNFS.writeFile(Diretorio + nome, sconf, 'ascii').then((r)=>{
      console.log('Success');
    }).catch((e)=>{
      console.log('Error', e);
    });
    
  }
  // Checa se tem permisao para exportar
  const exportPermission = async () =>{
    try{
      let permitido = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
      if(!permitido){
        // pedindo permissao caso nao tenha
        const garantindo = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title:"Permissao para armazenar é necessária",
            buttonPositive:"OK",
            buttonNegative:"Não",
          }
        );

        if(garantindo === PermissionsAndroid.RESULTS.GRANTED){
          exportData()
          console.log("Permissão garantida");
        }else{
          console.log("Permissão negada");
        }
      }else{
        // já tem a permissao
        exportData();
      }
    }catch(e){
      console.log('Error checando a permissão');
      console.log(e);
      return
    }
  };

  // mostra os experimentos exportados
  const importDir = (path) =>{
    RNFS.readDir(Diretorio).then(files =>{
      console.log(files)
      setHistoric(Array.from(files));
      
    }).catch(err=>{
      console.log(err.message,err.code);
    })
  }
  const renderDir = (item)=>{
    return(
      <TouchableHighlight  onPress={()=>importF(item.name)}
      style={{height:101 ,width:300,margin:10,padding:0,borderRadius:50,borderColor:'#ee8f00', borderWidth:20}}
      > 
        <View style={[styles.row, {backgroundColor: '#ee8f00'}]}>
          <Text style={{fontSize: 15, textAlign: 'center', color: '#333333', padding: 10}}>{item.name}</Text>
          {/* <Text style={{fontSize: 12, textAlign: 'center', color: '333333', padding: 10}}>{item.mtime}</Text> */}
          <Text style={{fontSize: 8, textAlign: 'center', color: '#333333', padding: 10}}>{item.size/1000}KB</Text>
        </View>
      </TouchableHighlight>
    );
  }
  const importF = (path)=>{
    RNFS.readFile(Diretorio+'/'+path, "ascii").then((res)=>{
      const book = XLSX.read(res, {type:"binary"});
      const sname = book.SheetNames[0];
      const sheet = book.Sheets[sname];
      const data = XLSX.utils.sheet_to_json(sheet, {header:1});
      console.log(data);
      let j = data.length;
      dhist1 = [];
      dhist2 = [];
      for(let i=1;j>i;i++){
        dhist1 = [...dhist1,{x:data[i][0],y:data[i][1]}];
        dhist2 = [...dhist2,{x:data[i][0],y:data[i][2]}];
      }
      console.log(dhist1);
      console.log(dhist2);
      setData1antiga(dhist1);
      setData2antiga(dhist2);
      // console.log(data2antiga)
      inAntigo();
      // console.log(data1antiga);
    }).catch(err=>{
      console.log(path);
      console.log(err.message,err.code);
    });
  }

  // Visual
  return (
    <View style={styles.container}>

        {/* Menu de inicio */}
        <View style={styles.header} >
          <TouchableOpacity style={styles.btnHeader}>
            <Image 
            // source={require('./src/menu.png')}
            style={styles.imgHeader}
            />
          </TouchableOpacity>
          <Text style={styles.titulo} > MeDifusi </Text>
          <TouchableOpacity style={styles.btnHeader} onPress={() => inCalibracao()} >
            <Image 
            source={require('./src/gear.png')}
            style={styles.imgHeader}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.area}>
          <TouchableOpacity style={styles.btn}>
            <Text style={styles.textoBtn} onPress={() => inBluetooth()}> Bluetooth </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn}>
            <Text style={styles.textoBtn} onPress={() => inNovaMedicao()} > Nova Medição </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn}>
            <Text style={styles.textoBtn} onPress={() => inHistorico()}> Histórico </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={() => inAtual()} disabled={atualInativo} >
            <Text style={styles.textoBtn}> Atual </Text>
          </TouchableOpacity>
        </View>

        {/* Modal Calibração */}
        <Modal animationType="fade" visible={modalCalibracao}>
              <View style={styles.container}>
                <View style={styles.header} >
                  <TouchableOpacity style={styles.btnHeader} onPress={() => outCalibracao()}>
                  <Image 
                    source={require('./src/seta.png')}
                    style={styles.imgHeader}
                    />
                  </TouchableOpacity>
                  <Text style={styles.titulo} >Calibração</Text>
                  <TouchableOpacity style={styles.btnHeader}>
                    <Image 
                    // source={require('./src/gear.png')}
                    style={styles.imgHeader}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.area} >
                  <View style={styles.areaInput}>
                    <Text style={styles.txt}>Sensor da água: </Text>
                    <Text style={styles.txt}>{calibrarT1}ºC</Text>
                  </View>
                  <View style={styles.areaInputCalibracao}>
                    <Text style={styles.txt}>Erro do sensor da água: </Text>
                    <TextInput style={styles.input} placeholder="ºC"
                    keyboardType="numeric"
                    onChangeText={(value) => setErroT1(value)}
                    />
                  </View>
                  <View style={styles.areaInput}>
                    <Text style={styles.txt}>Sensor do alimento: </Text>
                    <Text style={styles.txt}>{calibrarT2}ºC</Text>
                  </View>
                  <View style={styles.areaInputCalibracao}>
                    <Text style={styles.txt}>Erro do sensor do alimento: </Text>
                    <TextInput style={styles.input} placeholder="ºC"
                    keyboardType="numeric"
                    onChangeText={(value) => setErroT2(value)}
                    />
                  </View>
                  <TouchableOpacity style={styles.btn} >
                    <Text style={styles.textoBtn} onPress={aplicarErro} > Aplicar </Text>
                  </TouchableOpacity>
                </View>
              </View>
        </Modal>

        {/* Modal Bluetooth */}
        <Modal animationType="fade" visible={modalBluetooth}>
          <View style={styles.container}>
            <View style={styles.header} >
              <TouchableOpacity style={styles.btnHeader} onPress={() => outBluetooth()}>
                <Image 
                  source={require('./src/seta.png')}
                  style={styles.imgHeader}
                  />
              </TouchableOpacity>
              <Text style={styles.titulo} >Bluetooth</Text>
              <TouchableOpacity style={styles.btnHeader}>
                <Image 
                // source={require('./src/gear.png')}
                style={styles.imgHeader}
                />
              </TouchableOpacity>
            </View>
            <View > 
              <View style={styles.body}>
                <TouchableOpacity style={styles.btnble} onPress={() => startScan()} >
                  <Text style={styles.textoBtnble}>{'Escanear dispositivos (' + (isScanning ? 'on' : 'off') + ')'}</Text>
                </TouchableOpacity> 
                <TouchableOpacity style={styles.btnble} onPress={() => retrieveConnected()} >
                  <Text style={styles.textoBtnble}>Retornar dispositivos conectados</Text>
                </TouchableOpacity>           
                <FlatList
                  data={list}
                  renderItem={({ item }) => renderItem(item) }
                  keyExtractor={item => item.id}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal Nova Medição */}
        <Modal animationType="fade" visible={modalNovaMedicao}>
          <View style={styles.container}>
            <View style={styles.header} >
              <TouchableOpacity style={styles.btnHeader} onPress={() => outNovaMedicao()}>
                <Image 
                  source={require('./src/seta.png')}
                  style={styles.imgHeader}
                  />
              </TouchableOpacity>
              <Text style={styles.titulo} >Nova Medição</Text>
              <TouchableOpacity style={styles.btnHeader}>
                <Image 
                // source={require('./src/gear.png')}
                style={styles.imgHeader}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.area}>
              {/* <Text style={styles.subtitle}>Preencha os campos</Text> */}
              <View style={styles.areaInput}>
                <Text style={styles.txt}>Temperatura Inicial: </Text>
                <Text style={styles.txt}>{tempeInicial}ºC</Text>
              </View>
              <View style={styles.areaInput}>
                <Text style={styles.txt}>Temperatura Final: </Text>
                <TextInput style={styles.input} placeholder="ºC"
                keyboardType="numeric"
                onChangeText={(value) => setTempFinal(value)}
                />
              </View>
              <View style={styles.areaInput}>
                <Text style={styles.txt}>Tempo: </Text>
                <TextInput style={styles.input} placeholder="minutos"
                keyboardType="numeric"
                onChangeText={(value) => setTempo(value)}
                />
              </View>
              <TouchableOpacity style={styles.btn} >
                <Text style={styles.textoBtn} onPress={comecar} > Começar </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal Historico */}
        <Modal animationType="fade" visible={modalHistorico}>
          <View style={styles.container}>
            <View style={styles.header} >
              <TouchableOpacity style={styles.btnHeader} onPress={() => outHistorico()}>
                <Image 
                  source={require('./src/seta.png')}
                  style={styles.imgHeader}
                  />
              </TouchableOpacity>
              <Text style={styles.titulo} >Historico</Text>
              <TouchableOpacity style={styles.btnHeader}>
                <Image 
                // source={require('./src/gear.png')}
                style={styles.imgHeader}
                />
              </TouchableOpacity>
            </View>
            <View >   
              <View style={{alignItems:'center'}}>
                <FlatList
                  data={historic}
                  renderItem={({ item }) => renderDir(item) }
                  keyExtractor={item => item.name}
                  />    
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal Atual */}
        <Modal animationType="fade" visible={modalAtual}>
          <View style={styles.container}>
            <View style={styles.header} >
              <TouchableOpacity style={styles.btnHeader} onPress={() => outAtual()}>
                <Image 
                  source={require('./src/seta.png')}
                  style={styles.imgHeader}
                  />
              </TouchableOpacity>
              <Text style={styles.titulo} >Atual</Text>
              <TouchableOpacity style={styles.btnHeader} onPress={()=>exportPermission() } >
                <Image 
                source={require('./src/exportExcel.png')}
                style={styles.imgHeader}
                />
              </TouchableOpacity>
            </View>
            <View>
              <Text >Temperatura da água: {temperaturaAgua}°C</Text>
              <Text >Temperatura do alimento: {temperaturaAlimento} °C</Text>
              <Text >Tempo atual: {tempoAtual} segundos </Text>
              <Text >Temperatura alvo final: {tempFinal}°C </Text>
            </View>
            
            <View>
              <TouchableOpacity style={styles.btn} >
                <Text style={styles.textoBtn} onPress={() => renderWrite(peripherals, controleTXCharacteristic, 'stop')} > Parar </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btn} >
                <Text style={styles.textoBtn} onPress={() => renderGraphic(tempe1, tempe2)} > Gerar gráfico </Text>
              </TouchableOpacity>
              
            </View>
            { terminou ? (
            <TimeLineChart datarecebida1={datagrafic1} datarecebida2={datagrafic2} />
                ) : (<View>
                  {/* <TimeLineChart datarecebida1={datagrafic1} datarecebida2={datagrafic2} /> */}
                  </View>  )  }        
            
            
            {/* Mudar depois é apenas um espaço  */}
            <View><Text></Text></View>
          </View>
        </Modal>

        {/* Modal Antigo */}
        <Modal animationType="fade" visible={modalAntigo}>
          <View style={styles.container}>
            <View style={styles.header} >
              <TouchableOpacity style={styles.btnHeader} onPress={() => outAntigo()}>
                <Image 
                  source={require('./src/seta.png')}
                  style={styles.imgHeader}
                  />
              </TouchableOpacity>
              <Text style={styles.titulo} >Antigo</Text>
              <TouchableOpacity style={styles.btnHeader}  >
                <Image 
                // source={require('./src/exportExcel.png')}
                style={styles.imgHeader}
                />
              </TouchableOpacity>
            </View> 
            <View style={{flex:1}}>
          
              <TimeLineChart datarecebida1={data1antiga} datarecebida2={data2antiga} />
            </View>
          </View>
        </Modal>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ee6a00',
    // alignItems: 'center',
    // justifyContent: 'center',
  },
  header:{
    alignItems:'flex-start',
    justifyContent:'space-between',
    marginTop: 20,
    flexDirection:'row'
  },
  imgHeader:{
    width:70,
    height:70,
  },
  titulo:{
    marginTop:5,
    fontSize:40,
    fontWeight:'bold',
  },
  area:{
    flex:1,
    alignItems:'center',
    justifyContent:'space-around',
  },
  btn:{
    padding:10,
    margin:10,
    borderBottomColor:'#000',
    borderBottomWidth:5,
    borderRadius:15,
    backgroundColor:'#ee8f00'
  },
  btnble:{
    padding:10,
    margin:10,
    borderColor:'#000',
    borderBottomWidth:5,
    borderRadius:10,
    backgroundColor:'#ee8f00'
  },
  textoBtn:{
    fontSize:40,
    color: '#000',
  },
  textoBtnble:{
    fontSize:24,
    color: '#000',
  },
  subtitle:{
    fontSize:35,
    color: '#000',
  },
  areaInput:{
    flexDirection:'row',
  },
  areaInputCalibracao:{
    flexDirection:'column',
    alignItems:'center',
  },
  txt:{
    fontSize:27,
  },
  input:{
    height:32,
    width:100,
    borderWidth:1,
    borderColor:'#222',
    padding:2,
  },
  scrollView: {
    backgroundColor: '#c0c0c0',
  },
  body: {
    backgroundColor: '#ee6a00',
    alignItems:'center'
  },
  flatlist:{
    backgroundColor: '#ee6a00',
  }
});
