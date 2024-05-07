import React from 'react';
import { StyleSheet, Text, View, processColor} from 'react-native';
import update from 'immutability-helper';
import _ from 'lodash';  // MIT  https://lodash.com
import {LineChart} from 'react-native-charts-wrapper'; // MIT  https://github.com/wuxudong/react-native-charts-wrapper

class TimeLineChart extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      recebidos1: props.datarecebida1,
      recebidos2: props.datarecebida2,
      data: {},
      legend: {
        enabled: true,
        textColor: processColor('red'),
        textSize: 12,
        form: 'SQUARE',
        formSize: 14,
        xEntrySpace: 10,
        yEntrySpace: 5,
        formToTextSpace: 5,
        wordWrapEnabled: true,
        maxSizePercent: 0.5,
        custom: {
          colors: [processColor('green'), processColor('red')],
          labels: ['Temperatura 1', 'Temperatura 2',]
        }
      },
      marker: {
        enabled: true,
        markerColor: processColor('#F0C0FF8C'),
        textColor: processColor('white'),
        markerFontSize: 14,
      },

      selectedEntry: "",
      yAxis: {left:{enable:false}, right: {enabled: false}}
    }
  }

  componentDidMount(props) {
    console.log(this.state.recebidos1);
    console.log(this.state.recebidos2);
    this.setState(
      update(this.state, {
        data: {
          $set: {
            dataSets: [{
              values:this.state.recebidos1,
              label: 'Temperatura1',
              config:{
                lineWidth: 1,
                drawValues: true,
                circleRadius: 5,
                highlightEnabled: true,
                drawHighlightIndicators: true,
                color: processColor('green'),
                drawFilled: true,
                valueTextSize:10,
                fillColor: processColor('green'),
                fillAlpha: 45,
                valueFormatter: "###.0°C",
                circleColor: processColor('green')
              }
            }, {
              values: this.state.recebidos2,
              label: 'Temperatura 2',
              config: {
                lineWidth: 1,
                drawValues: true,
                circleRadius: 5,
                highlightEnabled: true,
                drawHighlightIndicators: true,
                color: processColor('red'),
                drawFilled: true,
                valueTextSize:10,
                fillColor: processColor('red'),
                fillAlpha: 45,
                valueFormatter: "###.0°C",
                circleColor: processColor('red')
              }
            }],
          }
        }
      })
    );
  }
  
  handleSelect(event) {
    let entry = event.nativeEvent
    let texto = "Temperatura= " + entry.data.y + " °C\n Tempo= " + entry.data.x + " segundos";
    if(entry.data.y == null | entry.data.x == null ) {
      this.setState({...this.state, selectedEntry: null})
    }else{
      this.setState({...this.state, selectedEntry: texto})
      // this.setState({...this.state, selectedEntry: JSON.stringify(entry)})
    }

    console.log(event.nativeEvent)
  }

  render() {
    let borderColor = processColor("red");
    return (
      <View style={{flex: 1}}>

        <View style={{height:80}}>
          <Text> Ponto selecionado:</Text>
          <Text> {this.state.selectedEntry}</Text>
        </View>

        <View style={styles.container}>


          <LineChart
            style={styles.chart}
            data={this.state.data}
            chartDescription={{text: ''}}
            legend={this.state.legend}
            marker={this.state.marker}

            drawGridBackground={true}

            borderColor={borderColor}
            borderWidth={1}
            drawBorders={true}

            yAxis={this.state.yAxis}

            
            onSelect={this.handleSelect.bind(this)}
            //console.log(event.nativeEvent)}

            ref="chart"
          />
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF'
  },
  chart: {
    flex: 1
  },
  btn:{
    padding:10,
    margin:10,
    borderBottomColor:'#000',
    borderBottomWidth:5,
    borderRadius:15,
    backgroundColor:'#ee8f00'
  }
});


export default TimeLineChart;