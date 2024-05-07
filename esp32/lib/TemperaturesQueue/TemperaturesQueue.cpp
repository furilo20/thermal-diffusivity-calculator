#include <TemperaturesQueue.h>

#include <Arduino.h>
#include <stdio.h>
#include <stdlib.h>

QNode* newNode(float tWater, float tSample)
{
    QNode* temp = (QNode*)malloc(sizeof(QNode));
    temp->temps.tSample = tSample;
    temp->temps.tWater = tWater;
    temp->next = NULL;
    return temp;
}
 
TemperatureQueue* createQueue()
{
    TemperatureQueue* q = (TemperatureQueue*)malloc(sizeof(TemperatureQueue));
    q->front = q->rear = NULL;
    q->number = 0;
    return q;
}
 

void enQueue(TemperatureQueue *tempQueue,float tWater, float tSample)
{
    QNode* temp = newNode(tWater, tSample);
    temp->temps.number = tempQueue->number++;
    if (tempQueue->rear == NULL) {
        tempQueue->front = tempQueue->rear = temp;
        return;
    }
    tempQueue->rear->next = temp;
    tempQueue->rear = temp;
}
 
void deQueue(TemperatureQueue *tempQueue)
{
    if (tempQueue->front == NULL)
        exit(0);
 
    QNode* temps = tempQueue->front;
    tempQueue->front = tempQueue->front->next;
    if (tempQueue->front == NULL)
        tempQueue->rear = NULL;
    free(temps);
}

MeasuredTemperatures getFirst(TemperatureQueue *tempQueue)
{
    if (tempQueue->front == NULL)
        exit(0);
 
    QNode* temps = tempQueue->front;
    MeasuredTemperatures t;
    t.number = temps->temps.number;
    t.tSample = temps->temps.tSample;
    t.tWater = temps->temps.tWater;
    return(t);
}



boolean hasDataEnqueued(TemperatureQueue *tempQueue)
{
    if(tempQueue->rear == NULL)
        return false;
    return true;
}

void resetCount(TemperatureQueue *tempQueue){
    tempQueue->number = 0;
}

 