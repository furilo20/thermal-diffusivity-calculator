#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <max6675.h>
#include <EEPROM.h>
#include <sstream>

#include <SPI.h>
#include <TFT_ST7735.h>
#include <Wire.h>


// #include <Adafruit_ST7735.h>
// #include <Adafruit_GFX.h>

// #include <queue>
#include "TemperaturesQueue.h"
#include "tempFila.h"
#include "FS_File_Record.h"
#include "MeasuredTemperatures.h"

#define SERVICE_UUID "ab0828b1-198e-4351-b779-901fa0e0371e"
#define CHARACTERISTIC_UUID_RX "4ac8a682-9736-4e5d-932b-e9b31405049c"
#define CHARACTERISTIC_UUID_TX "0972EF8C-7613-4075-AD52-756F33D4DA91"

#define EEPROM_SIZE 0x8
#define sensor1_calibration_address_position 0x0
#define sensor2_calibration_address_position 0x4


void sendTemp();
void getTemp();


// BLE
  BLECharacteristic *characteristicTX; //através desse objeto iremos enviar dados para o client
  BLECharacteristic *characteristicRX;
  BLEServer *server;
  boolean deviceConnected = false; //controle de dispositivo conectado
  boolean comecar = false;
  boolean calibracao = false;
  const uint8_t LED = 2; //LED interno do ESP32 (esse pino pode variar de placa para placa)
  
  uint lastSend = 0;
  boolean noResponse = false;
/////////////// end of BLE settings
  
// MAX
  const uint8_t thermoCLK = 12;
  const uint8_t thermoCS = 14;
  // sample sensor
  const uint8_t thermoDOsensor1 = 27;
  MAX6675 thermocouple1(thermoCLK, thermoCS, thermoDOsensor1);
  boolean sensor1connected = true;
  // water sensor
  const uint8_t thermoDOsensor2 = 13;
  MAX6675 thermocouple2(thermoCLK, thermoCS, thermoDOsensor2);
  boolean sensor2connected = true;

  uint8_t measureCounter = 0;
  const uint8_t measureCountLimit = 4;
  float sensor1Average = 0;
  float sensor2Average = 0;
  float errorsensor1 = 0;
  float errorsensor2 = 0;

  TemperatureQueue* tempQueue;

/////////////// end of MAX6675 settings

// TIMERS
// hw_timer_t *timerGet = NULL; 
// hw_timer_t *timerSend = NULL; 

uint16_t timeCounter = 0;

//
#define _cs   17  // goes to TFT CS
#define _dc   16  // goes to TFT DC
#define _mosi 23  // goes to TFT MOSI
#define _sclk 18  // goes to TFT SCK/CLK
#define _rst  5   // ESP RST to TFT RESET
  TFT_ST7735 tft = TFT_ST7735(_cs, _dc, _rst);

//

// ##############################################################################

//callback para eventos das características
class CharacteristicCallbacks: public BLECharacteristicCallbacks {
     void onWrite(BLECharacteristic *characteristic) {
          //retorna ponteiro para o registrador contendo o valor atual da caracteristica
          std::string rxValue = characteristic->getValue(); 
          //verifica se existe dados (tamanho maior que zero)
          if (rxValue.length() > 0) {
            for (int i = 0; i < rxValue.length(); i++) {
              Serial.print(rxValue[i]);
            }
            if (rxValue.find("start") != -1) {
              if(calibracao) return;
              comecar = true; 
              digitalWrite(LED, HIGH);
            }
            else if (rxValue.find("stop") != -1) {
              comecar = false; 
              digitalWrite(LED, LOW);
            }
            else if (rxValue.find("CA") != -1){
              if(comecar) return;
              calibracao = true;    
            }
            else if (calibracao && rxValue.find("E")){
              std::stringstream in(rxValue.substr(2));
              std::vector<float> values;
              int temp;
              while(in >> temp)
                values.push_back(temp);

              errorsensor1 = values[0];
              errorsensor2 = values[1];

              EEPROM.writeFloat(sensor1_calibration_address_position, errorsensor1);
              EEPROM.writeFloat(sensor2_calibration_address_position, errorsensor2);
              EEPROM.commit();
            }
            else if (rxValue.find("R") != -1){
              uint response; 
              std::stringstream num( rxValue.substr(2));
              num >> response;
              if(response == lastSend){
                deQueue(tempQueue);
                noResponse = false;
              }
            }
            
               
          }
     }//onWrite
};

//callback para receber os eventos de conexão de dispositivos
class ServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
      delay(1000);
      Serial.println("Connected...");
    };

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      delay(1000);
      Serial.println("Disconnected...");
      server->getAdvertising()->start();
    }
};

// ##############################################################################



void setup() {
  Serial.begin(115200);

  pinMode(LED, OUTPUT);

  ///////// BLE INIT

  // Create the BLE Device
  BLEDevice::init("ESP32-BLE"); // nome do dispositivo bluetooth
  // Create the BLE Server
  server = BLEDevice::createServer(); //cria um BLE server 
  
  server->setCallbacks(new ServerCallbacks()); //seta o callback do server
  // Create the BLE Service
  BLEService *service = server->createService(SERVICE_UUID);
  // Create a BLE Characteristic para envio de dados
  characteristicTX = service->createCharacteristic(
                      CHARACTERISTIC_UUID_TX,
                      BLECharacteristic::PROPERTY_NOTIFY //BLECharacteristic::PROPERTY_NOTIFY
                    );

  characteristicTX->addDescriptor(new BLE2902());

  characteristicRX = service->createCharacteristic(
                      CHARACTERISTIC_UUID_RX,
                      BLECharacteristic::PROPERTY_WRITE
                    );

  characteristicRX->setCallbacks(new CharacteristicCallbacks());
  // Start the service
  service->start();
  // Start advertising (descoberta do ESP32)
  server->getAdvertising()->start();
  Serial.println("Aguardando algum dispositivo conectar...");

  ///////// END OF BLE INIT

  ///////// DISPLAY INIT

  tft.begin();
  tft.print("hello fela da puta");

  ///////// END OF DISPLAY INIT

  ///////// QUEU INIT

  tempQueue = createQueue();

  ///////// END OF QUEU INIT

  EEPROM.begin(EEPROM_SIZE);
  errorsensor1 = EEPROM.readFloat(sensor1_calibration_address_position);
  errorsensor2 = EEPROM.readFloat(sensor2_calibration_address_position);

}

void loop() {

  delay(1);
  timeCounter++;
  
  if(timeCounter % 50 == 0){
    if(noResponse){
      deviceConnected = false;
      noResponse = false;
      server->getAdvertising()->start();
    }

    if(deviceConnected && hasDataEnqueued(tempQueue)){
      sendTemp();
    }
  }
  if(timeCounter % 250 == 0){
    getTemp();
    
  }

  if(timeCounter % 1000 == 0){
    timeCounter = 0;
  }

  
}


void sendTemp(){
    if(deviceConnected){
      MeasuredTemperatures t = getFirst(tempQueue);

      char txString[22] = {};
      char separator[1] = {' '};
      
      txString[0] = 'I';
      strcat(txString, separator);

      char aux[8]; 
      dtostrf(t.tWater, 2, 2, aux); // float_val, min_width, digits_after_decimal, char_buffer
      strcat(txString, aux);

      if(comecar){
        txString[0] = 'D';

        strcat(txString, separator);

        dtostrf(t.tSample, 2, 2, aux);
        strcat(txString, aux);

        strcat(txString, separator);

        dtostrf(t.number, 1, 0, aux);
        strcat(txString, aux);

        lastSend = t.number;

        noResponse = true;
      } 

      if(!comecar){
        resetCount(tempQueue);
      }

      if(calibracao){
        txString[0] = 'C';

        strcat(txString, separator);

        dtostrf(t.tSample, 2, 2, aux);
        strcat(txString, aux);
      }

      characteristicTX->setValue(txString);
      characteristicTX->notify();
      Serial.println(txString);
    }
}

void getTemp(){
  measureCounter++;
  sensor2Average += (float)thermocouple2.readCelsius();
  Serial.println("~~~~~~~~~~~~~~~");
  Serial.print("tWater: ");
  Serial.println(sensor2Average/measureCounter);
  if(comecar){
    sensor2Average += (float)thermocouple1.readCelsius();
  // Serial.print("tSample: ");
  // Serial.println(sensor1Average/measureCounter);
  // Serial.println("~~~~~~~~~~~~~~~");
  }

  if(measureCounter == measureCountLimit){
    if(sensor1Average == NAN){
      sensor1connected = false;
      return;
    }
    if(sensor2Average == NAN){
      sensor2connected = false;
      return;
    }

    enQueue(tempQueue, (sensor2Average/measureCountLimit - errorsensor2), (sensor1Average/measureCountLimit - errorsensor1));  
    sensor2Average = 0;
    sensor1Average = 0;
    measureCounter = 0;
  }
  
}
