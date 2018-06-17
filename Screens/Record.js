import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { StackNavigator } from 'react-navigation';
import AppLang from 'dedicate/AppLang';
import AppStyles from 'dedicate/AppStyles';
import Body from 'ui/Body';
import Textbox from 'fields/Textbox';
import Picker from 'fields/Picker';
import LocationPicker from 'fields/LocationPicker';
import DateTimePicker from 'fields/DateTimePicker'
import ButtonAdd from 'buttons/ButtonAdd';
import ButtonSave from 'buttons/ButtonSave';
import ButtonStopWatch from 'buttons/ButtonStopWatch';
import Button from 'buttons/Button';
import DbTasks from 'db/DbTasks';
import DbCategories from 'db/DbCategories';
import DbRecords from 'db/DbRecords';
import DateFormat from 'utility/DateFormat';
import StopWatch from 'ui/StopWatch';


class DefaultScreen extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            task:{
                id: props.navigation.state.params ? props.navigation.state.params.taskId : null,
                name:'', 
                inputs:[]
            },
            tasks:[],
            categories:[],
            selectedCategory:{
                id:0,
                tasks:[]
            },
            edited:false
        };

        var dbTasks = new DbTasks();
        var dbRecords = new DbRecords();

        //load a list of tasks
        var dbTasks = new DbTasks();
        this.state.tasks = dbTasks.GetTasksList({filtered:['category=$0 || category.id<=0',null]});

        //load a list of categories
        var dbCategories = new DbCategories();
        this.state.categories = dbCategories.GetCategoriesList({filtered:'tasks > 0'});
    }

    onSelectCategory = (event, id) => {
        var dbTasks = new DbTasks();
        this.setState({selectedCategory:{
            id:id,
            tasks: dbTasks.GetTasksList({filtered:['category.id=$0', id]})
        }});
    }
    
    render() {
        var that = this, i = 0;
        // Show List of Tasks to Choose From /////////////////////////////////////////////////////////////////////////////////////
        return (
            <Body {...this.props} style={styles.body} title="Record Event">
                <View style={styles.listContainer}>
                    <Text style={styles.tasksTitle}>Select a task to record your event with.</Text>
                    {this.state.categories.map((cat) => {
                        //load list of Categories
                        var tasks = null;
                        if(cat.id == this.state.selectedCategory.id){
                            tasks = (
                                <View key={cat.id}>
                                    {this.state.selectedCategory.tasks.map((task) => {
                                        //load list of Tasks within selected Category
                                        return this.taskItem.call(that, task, cat.id);
                                    })}
                                </View>
                            );
                        }
                        
                        if(cat.name != ''){
                            return (
                                //load Category item
                                <View key={cat.id}>
                                    <TouchableOpacity onPress={(event)=>{that.onSelectCategory.call(that, event, cat.id)}}>
                                        <View style={styles.catItem}>
                                            <Text style={styles.catText}>{cat.name}</Text>
                                        </View>
                                    </TouchableOpacity>
                                    {tasks}
                                </View>
                            );
                        }
                        return <View key={cat.id}></View>
                    })}

                    {this.state.tasks.map((task) => {
                        if(task.name != ''){
                            return this.taskItem.call(that, task, 0);
                        }
                        return <View key={task.id}></View>
                    })}
                </View>
            </Body>
        );
        
    }

    taskItem = (task, catId) => {
        var that = this;
        return (
            <TouchableOpacity key={task.id} onPress={(event)=>{this.props.navigation.navigate('RecordTask', {task:task})}}>
                <View style={styles.taskContainer}>
                    {catId > 0 && <View style={styles.subTaskGutter}></View>}
                    <View style={catId > 0 ? styles.taskSubItem : styles.taskItem}>
                        <Text style={styles.taskText}>{task.name}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
class RecordTaskScreen extends React.Component{ ///////////////////////////////////////////////////////////////////
    constructor(props){
        super(props);

        this.state = {
            task: props.navigation.state.params ? props.navigation.state.params.task : {},
            record:{datestart: new Date(), dateend: new Date((new Date()).getTime() + 10 * 60000), inputs:[]},
            stopWatch:{show:false, datestart:null, dateend:null},
            layoutChange:false
        }
        if(this.state.task.id){
            this.state.record.task = this.state.task;
        }
        if(this.state.task.inputs.length > 0){
            for(var x = 0, task; x < this.state.task.inputs.length; x++){
                var input = this.state.task.inputs[x];
                this.state.record.inputs[x] = {
                    type: input.type,
                    number:null,
                    text:null,
                    date:null,
                    input:input
                }
            }
        }
    }

    appLang = new AppLang();

    onLayoutChange = event => {
        this.setState({
            layoutChange:true
        });
        this.setState({
            layoutChange:false
        });
    }

    //validate form
    validateForm = () => {
        var show = true;
        for(x = 0; x < this.state.task.inputs.length; x++){
            var input = this.state.record.inputs[x];
            var dtype = this.getInputDataType(input.type);
            if(dtype == 1){ // Number data type
                if(input.number == null){show = false;}
                if(!Number.isInteger(input.number)){ show = false;}
            }
            else if(dtype == 2){ // Text data type
                if(input.text == null){show = false;}
                if(input.text == ''){show = false;}
            }
            else if(dtype == 3){ // Date data type
                if(input.date == null){show = false;}
                try{
                    var d = Date(input.date);
                }catch(ex){
                    show = false;
                }
            }
            if(show == false){break;}
        }
        this.setState({edited:show});
    }

    //Input Field Type
    getInputDataType(type){
        switch(type){
            case  0: case 5: case 6: case 7: // Number, Stop Watch, Yes/No, 5 Stars
                return 1;
            case 1: case 8: case 9: case 10: case 11: // Text, Location, URL Link, Photo, Video
                return 2;
            case 2: case 3: case 4: //Date, Time, Date & Time
                return 3;
        }
            return 0;
    }

    // Input Field Events
    onChangeText = (index, type, value, target) => {
        var record = this.state.record;
        var i = index - 1;
        switch(this.getInputDataType(type)){
            case  1: // Number data type
                var number = typeof value == 'number' ? value : (
                    typeof value == 'string' ? (value == '' ? null : parseInt(value)) : value
                );
                record.inputs[i].number = number;
                break;

            case 2: // Text data type
                record.inputs[i].text = value.toString();
                break;

            case 3: // Date/Time data type
                record.inputs[i].date = Date.parse(value);
                break;
        }
        this.setState({record:record});
        this.validateForm();
    }

    onSubmitEditing = (keyType, index) => {
        if(keyType == 'next'){
            var input = this.refs['input' + (index + 1)];
            if(input){
                if(input.focus){
                    input.focus();
                }
            }
            
        }else{
            var input = this.refs['input' + (index)];
            if(input){
                if(input.blur){
                    input.blur();
                }
            }
        }
    }

    onDateChange = (ref, id, date) => {
        var record = this.state.record;
        if(record.inputs == null){record.inputs = [];}
        record.inputs[id].date = date;
        this.setState(record);
    }

    onRecordedDateStartChange = (date) => {
        var record = this.state.record;
        record.datestart = date;
        this.setState({record:record})
    }

    onRecordedDateEndChange = (date) => {
        var record = this.state.record;
        record.dateend = date;
        this.setState({record:record})
    }

    onPressButtonStopWatch = () => {
        var stopWatch = this.state.stopWatch;
        stopWatch.show = true;
        this.setState({stopWatch:stopWatch});
    }

    onStopWatchStop = (datestart, dateend, ms) => {
        console.log(typeof datestart);
        console.log(typeof dateend);
        console.log(datestart);
        console.log(dateend);
        var stopWatch = this.state.stopWatch;
        var record = this.state.record;
        stopWatch.show = false;
        record.datestart = datestart;
        record.dateend = dateend;
        this.setState({
            stopWatch:stopWatch, 
            record:record
        });
    }

    onPressButtonSave = () => {
        //save to database
        var db = new DbRecords();
        db.CreateRecord(this.state.record);
        console.log(this.state.record);
        this.props.navigation.navigate('RecordDefault');
        setTimeout(() => {this.props.navigation.navigate('Overview');}, 100);
    }

    // TitleBar Button ////////////////////////////////////////////////////////////////////////////////////////
    TitleBarButtons = () => {
        var that = this;
        return (
            <View style={styles.titleBarButtons}>
                {this.state.edited == true && (
                    <View key="buttonSave" style={styles.buttonSaveContainer}>
                        <ButtonSave size="smaller" style={styles.buttonSave} onPress={this.onPressButtonSave} />
                    </View>
                )}
            </View>);
    }

    // Date & Time Utility //////////////////////////////////////////////////////////////////////////////////////
    getTimeLength =  (datestart, dateend) => {
        var diffMs = (dateend - datestart); // milliseconds between dates
        var diffMins =   Math.floor((diffMs / 1000) / 60); // total minutes
        var modSeconds = Math.floor((diffMs / 1000) % 60);
        var modMins =    Math.floor(diffMins % 60);
        var modHours =   Math.floor((diffMins / 60) % 24);
        var modDays =    Math.floor(diffMins / 1440);

        return 'Completed in' + 
            (modDays  > 0 ? ' ' + modDays + ' day' + (modDays != 1 ? 's' : '') + ', ' + modHours + ' hour' + (modHours != 1 ? 's' : '') + ', ' + modMins + ' minute' + (modMins != 1 ? 's' : '') :
            (modHours > 0 ? ' ' + modHours + ' hour' + (modHours != 1 ? 's' : '') + ', ' + modMins + ' minute' + (modMins != 1 ? 's' : '') :
            (modMins  > 0 ? ' ' + modMins + ' minute' + (modMins != 1 ? 's' : '') : 
            (modSeconds > 0 ? '' : ' no time')
            ))) + (modSeconds > 0 ? ' ' + modSeconds + ' second' + (modSeconds != 1 ? 's' : '') : '') + '.';
    }

    render(){
        var {height, width} = Dimensions.get('window');
        var that = this;
        var i = 0;
        return (
            <Body {...this.props} style={styles.body} title="Record Event" onLayout={this.onLayoutChange} 
            titleBarButtons={this.TitleBarButtons.call(that)}>
                <View style={styles.taskInfo}>
                    <View style={styles.labelContainer}>
                        <Text style={styles.labelText}>{this.state.task.name}</Text>
                    </View>
                    <View style={styles.recordTimeContainer}>
                        <View style={styles.recordTimeTitle}>
                            <Text style={[styles.fieldTitle, {alignSelf:'flex-start'}]}>Recorded Date & Time</Text>
                            {this.state.stopWatch.show == false && 
                                <View style={styles.buttonStopWatchContainer}>
                                    <ButtonStopWatch size="xsmall" style={styles.buttonStopWatch} onPress={this.onPressButtonStopWatch}/>
                                </View>
                            }
                            
                        </View>
                        
                        {this.state.stopWatch.show == false && // Show Date & Time Pickers /////////////////////////////////////////////////
                            <View>
                                <View style={styles.recordTimeFlex}>
                                    <View style={styles.recordTimeLabel}>
                                        <Text>Start:</Text>
                                    </View>
                                    <View style={styles.recordTimePicker}>
                                        <DateTimePicker
                                            styleTextbox={{minWidth:220}}
                                            date={this.state.record.datestart}
                                            type="datetime"
                                            placeholder="Date & Time"
                                            format={this.appLang.timeFormat}
                                            buttonConfirmText="Select Date & Time"
                                            buttonCancelText="Cancel"
                                            onDateChange={(time, date) => {this.onRecordedDateStartChange.call(that, date)}}
                                        />
                                    </View>
                                </View>

                                <View style={styles.recordTimeFlex}>
                                    <View style={styles.recordTimeLabel}>
                                        <Text>End:</Text>
                                    </View>
                                    <View style={styles.recordTimePicker}>
                                        <DateTimePicker
                                            styleTextbox={{minWidth:220}}
                                            date={this.state.record.dateend}
                                            type="datetime"
                                            placeholder="Date & Time"
                                            format={this.appLang.timeFormat}
                                            buttonConfirmText="Select Date & Time"
                                            buttonCancelText="Cancel"
                                            onDateChange={(time, date) => {this.onRecordedDateEndChange.call(that, date)}}
                                        />
                                    </View>
                                </View>
                                
                                <Text style={styles.recordTimeLength}>
                                    {this.getTimeLength(this.state.record.datestart, this.state.record.dateend)}
                                </Text>
                            </View>
                        }
                        {this.state.stopWatch.show == true && // Show Stop Watch Instead /////////////////////////////////////////////////
                            <View style={styles.stopWatchContainer}>
                                <StopWatch width={width - 120} height={width - 120}
                                    onStop={this.onStopWatchStop}
                                 />
                            </View>
                        }
                    </View>
                </View>
                <View style={styles.inputsContainer}>
                    {this.state.task.inputs.map((input) => {
                        var keyType = 'done';
                        if(i < this.state.task.inputs.length - 1){
                            keyType = 'next';
                        }
                        i++;
                        var e = parseInt(i.toString());
                        var ref = 'input' + e;
                        switch(input.type){
                            case 0: //Number
                                return (
                                    <View key={input.id} style={[styles.inputFieldContainer, styles.padding]}>
                                        <Text style={styles.fieldTitle}>{input.name}</Text>
                                        <Textbox 
                                            ref={ref}
                                            style={styles.inputField}
                                            placeholder={'10'}
                                            keyboardType="numeric"
                                            returnKeyType={keyType} 
                                            blurOnSubmit={false}
                                            onSubmitEditing={() => {that.onSubmitEditing.call(that, keyType, e)}}
                                            onChangeText={(text) => {that.onChangeText.call(that, e, input.type, text, this)}}
                                        />
                                    </View>
                                )
                                break;
                            case 1: //Text
                                return (
                                    <View key={input.id} style={[styles.inputFieldContainer, styles.padding]}>
                                        <Text style={styles.fieldTitle}>{input.name}</Text>
                                        <Textbox 
                                            ref={ref}
                                            style={styles.inputField}
                                            placeholder={'Text'}
                                            returnKeyType={keyType} 
                                            blurOnSubmit={false}
                                            onSubmitEditing={() => {that.onSubmitEditing.call(that, ref, keyType.toString(), e)}}
                                            onChangeText={(text) => {that.onChangeText.call(that, e, input.type, text, this)}}
                                        />
                                    </View>
                                )
                                break;
                            case 2: //Date
                                return (
                                    <View key={input.id} style={[styles.inputFieldContainer, styles.padding]}>
                                        <Text style={styles.fieldTitle}>{input.name}</Text>
                                        <DateTimePicker
                                            ref={ref}
                                            style={{width: 200}}
                                            date={that.state.record.date || new Date()}
                                            type="date"
                                            placeholder="Date"
                                            format={that.appLang.dateFormat}
                                            minDate="0-01-01"
                                            buttonConfirmText="Select Date"
                                            buttonCancelText="Cancel"
                                            onDateChange={(time, date) => {that.onDateChange.call(that, ref, input.id, date)}}
                                        />
                                    </View>
                                )
                                break;
                            case 3: //Time
                                return (
                                    <View key={input.id} style={[styles.inputFieldContainer, styles.padding]}>
                                        <Text style={styles.fieldTitle}>{input.name}</Text>
                                        <DateTimePicker
                                            ref={ref}
                                            style={{width: 200}}
                                            date={that.state.record.date || new Date()}
                                            type="time"
                                            placeholder="Time"
                                            format={that.appLang.timeFormat}
                                            buttonConfirmText="Select Time"
                                            buttonCancelText="Cancel"
                                            onDateChange={(time, date) => {that.onDateChange.call(that, ref, input.id, date)}}
                                        />
                                    </View>
                                )
                                break;
                            case 4: //Date & Time
                                return (
                                    <View key={input.id} style={[styles.inputFieldContainer, styles.padding]}>
                                        <Text style={styles.fieldTitle}>{input.name}</Text>
                                        <DateTimePicker
                                            ref={ref}
                                            style={{width: 200}}
                                            date={that.state.record.date || new Date()}
                                            type="datetime"
                                            placeholder="Date & Time"
                                            format={that.appLang.timeFormat}
                                            buttonConfirmText="Select Time"
                                            buttonCancelText="Cancel"
                                            onDateChange={(time, date) => {that.onDateChange.call(that, ref, input.id, date)}}
                                        />
                                    </View>
                                )
                                break;
                            case 5: //Stop Watch
                                return (
                                    <View key={input.id} style={[styles.inputFieldContainer, styles.padding]}>
                                        <Text style={styles.fieldTitle}>{input.name}</Text>
                                        <Textbox 
                                            ref={ref}
                                            style={styles.inputField}
                                            placeholder={'30'}
                                            keyboardType="numeric"
                                            returnKeyType={keyType} 
                                            blurOnSubmit={false}
                                            onSubmitEditing={() => {that.onSubmitEditing.call(that, keyType, e)}}
                                            onChangeText={(text) => {that.onChangeText.call(that, e, input.type, text, this)}}
                                        />
                                    </View>
                                )
                                break;
                            case 6: //Yes/No
                                return (
                                    <View key={input.id} style={[styles.inputFieldContainer, styles.padding]}>
                                        <Text style={styles.fieldTitle}>{input.name}</Text>
                                        <Picker
                                            ref={ref}
                                            items={[
                                                {key:0, label:'No'},
                                                {key:1, label:'Yes'}
                                            ]}
                                        />
                                    </View>
                                )
                                break;
                            case 7: //5 Stars
                                return (
                                    <View key={input.id} style={[styles.inputFieldContainer, styles.padding]}>
                                        <Text style={styles.fieldTitle}>{input.name}</Text>
                                        
                                    </View>
                                )
                                break;
                            case 8: //Location
                                return (
                                    <View key={input.id} style={styles.inputFieldContainer}>
                                        <Text style={[styles.fieldTitle, styles.padding]}>{input.name}</Text>
                                        <LocationPicker 
                                            ref={ref}
                                            textInputStyle={[styles.inputField, styles.padding]}
                                            placeholder={'search'}
                                            returnKeyType={keyType} 
                                            blurOnSubmit={false}
                                            onSubmitEditing={() => {that.onSubmitEditing.call(that, keyType, e)}}
                                        />
                                    </View>
                                )
                                break;
                            case 9: //URL Link
                                return (
                                    <View key={input.id} style={[styles.inputFieldContainer, styles.padding]}>
                                        <Text style={styles.fieldTitle}>{input.name}</Text>
                                        <Textbox 
                                            ref={ref}
                                            style={styles.inputField}
                                            placeholder={'URL link'}
                                            returnKeyType={keyType} 
                                            blurOnSubmit={false}
                                            onSubmitEditing={() => {that.onSubmitEditing.call(that, keyType, e)}}
                                            onChangeText={(text) => {that.onChangeText.call(that, e, input.type, text, this)}}
                                        />
                                    </View>
                                )
                                break;
                            case 10: //Photo
                                var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
                                var monthindex = that.state.record.date.getMonth();
                                var day = ("0" + that.state.record.date.getDate()).slice(-2);
                                if(monthindex < 0){monthindex = 0;}
                                return (
                                    <View key={input.id} style={[styles.inputFieldContainer, styles.padding]}>
                                        <Text style={styles.fieldTitle}>{input.name}</Text>
                                        <Textbox 
                                            ref={ref}
                                            style={styles.inputField}
                                            placeholder={'/Photos/' + that.state.record.date.getFullYear() + '/' + (months[monthindex]) + ' ' + day + ' - ' + (this.state.task.name)}
                                            returnKeyType={keyType} 
                                            blurOnSubmit={false}
                                            onSubmitEditing={() => {that.onSubmitEditing.call(that, keyType, e)}}
                                            onChangeText={(text) => {that.onChangeText.call(that, e, input.type, text, this)}}
                                        />
                                    </View>
                                )
                                break;
                            case 11: //Video
                                return (
                                    <View key={input.id} style={[styles.inputFieldContainer, styles.padding]}>
                                        <Text style={styles.fieldTitle}>{input.name}</Text>
                                        
                                    </View>
                                )
                                break;
                        }
                        return (<View key={input.id}></View>)
                    })}
                </View>
            </Body>
        );
    }
}

const styles = StyleSheet.create({
    body:{backgroundColor:AppStyles.altBackgroundColor},
    container:{paddingVertical:30, paddingBottom:70},
    listContainer:{paddingBottom:75, backgroundColor:AppStyles.backgroundColor},
    tasksTitle:{fontSize:17, color:AppStyles.color, paddingBottom:20, paddingHorizontal:30, paddingTop:30},
    labelContainer:{paddingBottom:30, paddingHorizontal:30},
    labelText:{fontSize:30},

    //Categories & Tasks List
    catItem:{
        paddingVertical:15, 
        paddingHorizontal:30, 
        borderBottomWidth:1, 
        borderBottomColor:AppStyles.color + '55'
    },
    catText:{fontSize:22, color:AppStyles.color},
    taskContainer:{flexDirection:'row'},
    taskItem:{
        paddingVertical:15, paddingHorizontal:30, borderBottomWidth:1,
        borderBottomColor:AppStyles.separatorColor
    },
    taskSubItem:{
        paddingVertical:15, paddingHorizontal:30, borderBottomWidth:1,
        borderBottomColor:AppStyles.separatorColor, flexDirection:'row'
    },
    taskText:{fontSize:20},
    subTaskGutter:{backgroundColor:AppStyles.color, height:60, width:45},

    //task input fields
    taskInfo:{backgroundColor:AppStyles.backgroundColor, paddingTop:20},
    inputsContainer:{backgroundColor:AppStyles.altBackgroundColor, paddingTop:20, paddingBottom:70},
    inputFieldContainer:{paddingBottom:15},
    padding:{marginHorizontal:30},
    fieldTitle: {fontSize:16, fontWeight:'bold'},
    inputField: {fontSize:20},

    //Record Task title
    recordTimeTitle:{flex:1, flexDirection:'row', width:'100%'},

    //Stop Watch Button
    buttonStopWatchContainer:{position:'absolute', right:0},
    buttonStopWatch:{},

    //Record Task form
    recordTimeContainer:{paddingBottom:20, paddingHorizontal:30, width:'100%'},
    recordTimeFlex:{flexDirection:'row'},
    recordTimeLabel:{alignSelf:'flex-start', width:35, paddingTop:17},
    recordTimePicker:{alignSelf:'flex-start', paddingLeft:10},
    recordTimeLength:{paddingTop:10},
    recordTimeField:{width:250, paddingTop:5},

    //Stop Watch UI
    stopWatchContainer:{paddingTop:15, paddingHorizontal:30},

    //title bar buttons
    titleBarButtons:{flexDirection:'row'},
    buttonSaveContainer: {width:75, zIndex:1001, paddingLeft:10, paddingBottom:12, backgroundColor:AppStyles.headerDarkColor},
    buttonSave:{padding:12 },
});

const RecordScreen = StackNavigator( 
    {
        RecordDefault: {screen: DefaultScreen},
        RecordTask: {screen: RecordTaskScreen}
    },
    {
        headerMode:'none'
    }
);

export default RecordScreen;