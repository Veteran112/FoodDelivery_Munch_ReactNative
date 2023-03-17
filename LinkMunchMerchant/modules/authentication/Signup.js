import React, { useState, useRef } from 'react';
import { Text, Input, Button, CheckBox } from 'react-native-elements';
import { View, StyleSheet, ScrollView, Alert, Dimensions } from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { RFValue } from 'react-native-responsive-fontsize';
import PhoneInput from 'react-native-phone-number-input';
import { Auth } from 'aws-amplify';
import AsyncStorage from '@react-native-async-storage/async-storage';
import state from '../restaurant/components/state.json'
import Picker from 'react-native-picker-select';


export default function Signup({ authState, onStateChange }) {
  const [data, setData] = useState({
    // CHANGE ME
    email: 'support@linkmunch.com',
    username: '',
    identifier: '',
    password: '',
    phonenumber: '',
    userType: 'restaurant',
    businessName: '',
    firstName: '',
    lastName: '',
    addressLine: '',
    addressCity: '',
    addressState: '',
    addressZip: '',
    instagram: '',
    admin: false,
    resetPW: false,
    // restaurantEmail: ''
  });
  const windowWidth = Dimensions.get('window').width;
  const selectPicker = useRef(null);

  const [error, seterror] = useState('');
  // const tempPassword = Math.random().toString(36).slice(2, 10)

  const signUp = () => {
    if (!data.userType) {
      seterror('You have to select the user type');
      return;
    }
    if (!data.businessName) {
      seterror('Please fill out the \'Business Name\' field!');
      return;
    }
    if (!data.firstName) {
      seterror('Please fill out the \'First Name\' field!');
      return;
    }
    if (!data.lastName) {
      seterror('Please fill out the \'Last Name\' field!');
      return;
    }
    if (!data.addressLine || !data.addressCity || !data.addressState || !data.addressZip) {
      seterror('Please fully fill out the \'Business Address\' field!');
      return;
    }
    Auth.signUp({
      username: data.username.toLowerCase(),
      password: data.password,
      attributes: {
        email: data.email.toLowerCase(),
        preferred_username: data.username.toLowerCase(),
        phone_number: data.phonenumber
      },
    })
      .then(res => {
        AsyncStorage.setItem(
          'userdata',
          JSON.stringify({
            email: data.email.toLowerCase(),
            username: data.username.toLowerCase(),
            incoming_Id: res.userSub,
            userType: data.userType,
            phoneNumber: data.phonenumber,
            businessName: data.businessName,
            firstName: data.firstName,
            lastName: data.lastName,
            addressLine: data.addressLine,
            addressCity: data.addressCity,
            addressState: data.addressState,
            addressZip: data.addressZip,
            instagram: data.instagram,
            admin: true,
            resetPW: data.resetPW,
            // restaurantEmail: data.restaurantEmail
          }),
        );

        setData({
          // CHANGE ME
          email: 'support@linkmunch.com',
          username: '',
          password: '',
          phonenumber: '',
          userType: 'restaurant',
          businessName: '',
          firstName: '',
          lastName: '',
          addressLine: '',
          addressCity: '',
          addressState: '',
          addressZip: '',
          instagram: '',
          admin: false,
          resetPW: false,
          // restaurantEmail: ''
        });
        seterror('');
        onStateChange('confirmSignUp');

      })
      .catch(err => {
        seterror(err.message);
        console.error('error', err);
      });
  };

  async function getUserTable(userId) {
    const body = JSON.stringify({
      incoming_Id: userId,
      is_customer: false,
      email: data.email,
      phoneNumber: data.phone,
      businessName: data.businessName,
      firstName: data.firstName,
      lastName: data.lastName,
      addressLine: data.addressLine,
      addressCity: data.addressCity,
      addressState: data.addressState,
      addressZip: data.addressZip,
      instagram: data.instagram,
      admin: true,
      resetPW: false
    });
    console.log('body', body)
    const response = await fetch(
      'https://9yl3ar8isd.execute-api.us-west-1.amazonaws.com/beta/getuserid',
      {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        mode: 'cors', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'same-origin', // include, *same-origin, omit
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
        },
        redirect: 'follow', // manual, *follow, error
        referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        body: body, // body data type must match “Content-Type” header
      },
    );
    let dataResponse = await response.json(); // parses JSON response into native JavaScript objects

    console.log(dataResponse);
    return dataResponse;
  }

  if (authState == 'signUp') {
    return (
      <View>
        <ScrollView style={style.container}>
          <Text h4 h4Style={{ fontSize: RFValue(18, 580) }}>
            Create a new account
          </Text>
          <View style={{ marginTop: 15 }}>
            {error != '' && (
              <Text style={{ color: '#D65344', textAlign: 'center' }}>{error}</Text>
            )}
            <Input
              label="Business Name *"
              value={data.businessName}
              autoCapitalize="none"
              inputStyle={style.inputStyle}
              inputContainerStyle={style.inputContainerStyle}
              containerStyle={style.inputBoxStyle}
              labelStyle={style.labelStyle}
              onChangeText={value => setData({ ...data, businessName: value })}
              renderErrorMessage={false}
            />
            <View style={style.inputFlexView}>
              <Input
                label="First Name *"
                value={data.firstName}
                autoCapitalize="none"
                inputStyle={style.inputStyle}
                inputContainerStyle={[style.inputFlex, style.inputContainerStyle]}
                containerStyle={style.inputBoxStyle}
                labelStyle={style.labelStyle}
                onChangeText={value => setData({ ...data, firstName: value })}
                renderErrorMessage={false}
              />
              <Input
                label="Last Name *"
                value={data.lastName}
                autoCapitalize="none"
                inputStyle={style.inputStyle}
                inputContainerStyle={[style.inputFlex, style.inputContainerStyle]}
                containerStyle={style.inputBoxStyle}
                labelStyle={style.labelStyle}
                onChangeText={value => setData({ ...data, lastName: value })}
                renderErrorMessage={false}
              />
            </View>
            {/* <Input
              label="Restaurant Email *"
              value={data.restaurantEmail}
              autoCapitalize="none"
              inputStyle={style.inputStyle}
              inputContainerStyle={style.inputContainerStyle}
              containerStyle={style.inputBoxStyle}
              labelStyle={style.labelStyle}
              onChangeText={value => {
                setData({ ...data, restaurantEmail: value })
              }}
              renderErrorMessage={false}
            /> */}
            <Input
              label="Username *"
              value={data.username}
              autoCapitalize="none"
              inputStyle={style.inputStyle}
              inputContainerStyle={style.inputContainerStyle}
              containerStyle={style.inputBoxStyle}
              labelStyle={style.labelStyle}
              onChangeText={value => {
                // CHANGE ME
                // let e = `cas.thomas.r+${value}@gmail.com`
                let e = `support+${value}@linkmunch.com`
                setData({ ...data, email: e, username: value })
                // setData({ ...data, username: value })
              }}
              renderErrorMessage={false}
            />
            {/* <Text style={{paddingLeft: '3%'}}>
              Verification Email (will change on profile release):
            </Text> */}
            <Text style={{paddingLeft: '3%'}}>
              {data.email}
            </Text>
            <Input
              label="Business Address *"
              placeholder="Address Line 1"
              value={data.addressLine}
              autoCapitalize="none"
              inputStyle={style.inputStyle}
              inputContainerStyle={style.inputContainerStyle}
              containerStyle={style.inputBoxStyle}
              labelStyle={style.labelStyle}
              onChangeText={value => setData({ ...data, addressLine: value })}
              renderErrorMessage={false}
            />
            <Input
              placeholder="City"
              value={data.addressCity}
              autoCapitalize="none"
              inputStyle={style.addressInputStyle}
              inputContainerStyle={style.inputContainerStyle}
              containerStyle={style.inputBoxStyle}
              labelStyle={style.labelStyle}
              onChangeText={value => setData({ ...data, addressCity: value })}
              renderErrorMessage={false}
            />
            <View style={[style.inputFlexView, { marginTop: 5 }]}>
              <Picker
                ref={selectPicker}
                pickerProps={{
                  accessibilityLabel: 'State',
                }}
                value={data.addressState}
                items={Object.keys(state).map(item => ({
                  label: state[item],
                  value: item,
                }))}
                placeholder={{ label: 'State' }}
                textInputProps={{
                  style: {
                    width: windowWidth / 2.5,
                    // height: 44,
                    marginLeft: '7%',
                    borderRadius: 5,
                    borderColor: '#888',
                    borderWidth: 1,
                    padding: 2,
                    fontSize: RFValue(15, 580),
                    color: '#888',
                  },
                }}
                onValueChange={value => setData({ ...data, addressState: value })}
              />
              <Input
                placeholder="Zip Code"
                value={data.addressZip}
                autoCapitalize="none"
                inputStyle={style.addressInputStyle}
                keyboardType='numeric'
                inputContainerStyle={[style.inputFlex, style.inputContainerStyle]}
                containerStyle={style.inputBoxStyle}
                labelStyle={style.labelStyle}
                onChangeText={value => setData({ ...data, addressZip: value })}
                renderErrorMessage={false}
              />
            </View>
            <Input
              label="Password *"
              value={data.password}
              secureTextEntry={true}
              inputStyle={style.inputStyle}
              inputContainerStyle={style.inputContainerStyle}
              containerStyle={style.inputBoxStyle}
              labelStyle={style.labelStyle}
              onChangeText={value => setData({ ...data, password: value })}
              renderErrorMessage={false}
            />
            <Input
              label="Instagram (optional)"
              value={data.instagram}
              autoCapitalize="none"
              inputStyle={style.inputStyle}
              inputContainerStyle={style.inputContainerStyle}
              containerStyle={style.inputBoxStyle}
              labelStyle={style.labelStyle}
              onChangeText={value => setData({ ...data, instagram: value })}
              renderErrorMessage={false}
            />
            <View style={{ paddingLeft: 10 }}>
              <Text style={{ marginTop: 5 }}>Phone Number (optional)</Text>
              <PhoneInput
                defaultCode="US"
                layout="first"
                withDarkTheme
                withShadow
                value={data.phonenumber}
                containerStyle={{
                  marginTop: 5,
                  borderWidth: 1,
                  borderColor: '#888',
                }}
                onChangeFormattedText={value =>
                  setData({ ...data, phonenumber: value })
                }
              />
            </View>
            {/* <View style={{ display: 'flex', flexDirection: 'row' }}>
              <CheckBox
                checked={data.admin}
                onPress={value => setData({ ...data, admin: !data.admin })}
              />
              <Text style={{ alignSelf: 'center' }}>Are you a LinkMunch admin?</Text>
            </View> */}
            <Button
              buttonStyle={style.buttonStyle}
              title="NEXT"
              onPress={() => { signUp(); }}
            />
            <Button
              type="clear"
              title="Sign In"
              titleStyle={{ color: '#AAAA00' }}
              buttonStyle={{ marginTop: 25 }}
              containerStyle={{paddingBottom: '30%'}}
              onPress={() => onStateChange('signIn')}
            />
          </View>
        </ScrollView >
      </View >
    )
  } else {
    return null;
  }
}

const style = StyleSheet.create({
  container: {
    width: 'auto',
    padding: '5%',
  },
  labelStyle: {
    color: 'black',
    fontWeight: 'normal',
    marginTop: 10
  },
  inputStyle: {
    marginTop: 2,
    borderRadius: 5,
    borderColor: '#888',
    borderWidth: 1,
    minHeight: undefined,
    paddingVertical: 3,
    paddingHorizontal: 5,
    marginBottom: 5
  },
  lastInputStyle: {
    marginTop: 2,
    borderRadius: 5,
    borderColor: '#888',
    borderWidth: 1,
    minHeight: undefined,
    paddingVertical: 3,
    paddingHorizontal: 5,
  },
  addressInputStyle: {
    borderRadius: 5,
    borderColor: '#888',
    borderWidth: 1,
    minHeight: undefined,
    paddingVertical: 3,
    paddingHorizontal: 5,
  },
  inputContainerStyle: {
    borderBottomWidth: 0,
  },
  inputBoxStyle: {
  },
  buttonStyle: {
    backgroundColor: '#D65344',
    paddingTop: 15,
    paddingBottom: 15,
    marginTop: 15,
  },
  inputFlexView: {
    display: 'flex',
    flexDirection: 'row',
    flex: 1,
    width: '50%'
  },
  inputFlex: {
    flex: 1
  },
});
