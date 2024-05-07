#include <Arduino.h>

#include "..\Utilitarios\MeasuredTemperatures.h"


typedef struct QNode {
    MeasuredTemperatures temps;
    struct QNode* next;
} QNode;
 
// The queue, front stores the front node of LL and rear stores the
// last node of LL
typedef struct {
    QNode *front, *rear;
    unsigned int number;
} TemperatureQueue;


// void QueueInit();

TemperatureQueue* createQueue();

void enQueue(TemperatureQueue *tempQueue, float tWater, float tSample);

void deQueue(TemperatureQueue *tempQueue);

MeasuredTemperatures getFirst(TemperatureQueue *tempQueue);

boolean hasDataEnqueued(TemperatureQueue *tempQueue);

void resetCount(TemperatureQueue *tempQueue);