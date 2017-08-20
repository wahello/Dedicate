import React from 'react';

import { AppRegistry, View, StyleSheet, Text, 
    Dimensions, TouchableWithoutFeedback, TextInput, ScrollView, Keyboard  } from 'react-native';
import AppStyles from 'dedicate/AppStyles';

export default class Modal extends React.Component {
    constructor(props){
        super(props);

        this.state = {
            styles:{
                darkBackgroundContainer:{height:0},
                darkBackground:{height:0},
                modalContainer:{top:30, left:50}
            },
            visible:false,
            content: <View></View>
        }
        global.Modal = this;
    }

    ComponentDidMount = () => {
        this.onLayoutChange();
    }

    onLayoutChange = event => {
        var win = Dimensions.get('window');
        var modalContainer = event.nativeEvent.layout;
        var styles = this.state.styles;
        styles.darkBackgroundContainer = {height:win.height};
        styles.darkBackground = {height:win.height};
        styles.modalContainer = {
            top:(win.height - modalContainer.height) / 2, 
            left:(win.width - modalContainer.width) / 2,
            maxHeight:win.height - 60,
            maxWidth:win.width - 60
        };
        this.setState({styles:styles});
    }

    show = () => {
        Keyboard.dismiss();
        TextInput.State.blurTextInput();
        this.setState({visible:true});
    }

    hide = () => {
        this.setState({visible:false})
    }

    setContent = (title, content) => {
        this.setState({title:title, content:content});
    }

    onPressDarkBackground = () => {
        this.setState({visible:false});
    }

    render(){
        if(this.state.visible === true){
            return (
                <View style={styles.container}>
                    <View style={[styles.modalContainer, this.state.styles.modalContainer]}>
                        <View style={styles.titleContainer}>
                            <Text style={styles.title}>{this.state.title}</Text>
                        </View>
                        <ScrollView 
                            onLayout={this.onLayoutChange}
                        >
                        
                    

                            {this.state.content(this)}
                        </ScrollView>
                    </View>
                    <View style={[styles.darkBackgroundContainer, this.state.styles.darkBackgroundContainer]}>
                        <TouchableWithoutFeedback onPress={this.onPressDarkBackground}>
                            <View 
                                style={[styles.darkBackground, this.state.styles.darkBackground]} 
                                onLayout={this.onLayoutChange}
                            ></View>
                        </TouchableWithoutFeedback>
                    </View>
                </View>
            );
        }
        return <View></View>
    }
}

const styles = StyleSheet.create({
    container:{position:'absolute', top:0, right:0, bottom:0, left:0},
    titleContainer:{paddingTop:15, paddingHorizontal:15},
    title:{fontSize:20},
    darkBackgroundContainer:{position:'absolute', top:0, right:0, bottom:0, left:0},
    darkBackground:{backgroundColor:'rgba(0,0,0,0.7)', position:'absolute', top:0, right:0, bottom:0, left:0, zIndex:5000},
    modalContainer:{position:'absolute', zIndex:5001, backgroundColor:AppStyles.backgroundColor}
});