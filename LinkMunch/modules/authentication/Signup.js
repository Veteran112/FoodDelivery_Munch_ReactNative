import React, { useState } from 'react';
import { Text, Input, Button } from 'react-native-elements';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { RFValue } from 'react-native-responsive-fontsize';
import PhoneInput from 'react-native-phone-number-input';
import { Auth } from 'aws-amplify';
import AsyncStorage from '@react-native-async-storage/async-storage';

var codesGlobal = []
var sent = false

export default function Signup({ authState, onStateChange }) {
  const [data, setData] = useState({
    email: '',
    password: '',
    phonenumber: '',
    userType: 'customer',
    basicAccount: 'false',
    firstName: '',
    lastName: '',
    accessCode: ''
  });

  const [error, seterror] = useState('');
  if (codesGlobal.length === 0 && !sent) {
    getCodes()
  }
  const signUp = () => {

    if (codesGlobal.includes(data.accessCode)) {
      Auth.signUp({
        username: data.email.toLowerCase(),
        password: data.password,
        attributes: {
          email: data.email.toLowerCase(),
          phone_number: data.phonenumber
        },
      })
        .then(res => {
          AsyncStorage.setItem(
            'userdata',
            JSON.stringify({
              email: data.email.toLowerCase(),
              userId: res.userSub,
              userType: data.userType,
              phoneNumber: data.phonenumber,
              basicAccount: data.basicAccount,
              firstName: data.firstName,
              lastName: data.lastName,
              accessCode: data.accessCode
            }),
          );

          setData({
            email: '',
            password: '',
            phonenumber: '',
            userType: 'customer',
            basicAccount: 'false',
            firstName: '',
            lastName: '',
            accessCode: ''
          });
          seterror('');
          onStateChange('confirmSignUp');
        })
        .catch(err => {
          seterror(err.message);
          console.error('error', err);
        });
    } else {
      seterror("I'm sorry, that sign up code is incorrect!  Please double check the code that you used or contact support at support@linkmunch.com.")
    }
  };

  if (authState == 'signUp') {
    return (
      <ScrollView style={style.container}>
        <Text h4 h4Style={{ fontSize: RFValue(18, 580) }}>
          Create a new account
        </Text>
        <View style={{ marginTop: 15 }}>
          {error != '' && (
            <Text style={{ color: 'red', textAlign: 'center', paddingBottom: 10 }}>{error}</Text>
          )}
          <Input
            label="Email *"
            value={data.email}
            autoCapitalize="none"
            inputStyle={style.inputStyle}
            inputContainerStyle={{ borderBottomWidth: 0 }}
            style={{ marginTop: 15 }}
            labelStyle={{ color: 'black', fontWeight: 'normal' }}
            onChangeText={value => setData({ ...data, email: value })}
          />
          <Input
            label="First Name *"
            value={data.firstName}
            autoCapitalize="words"
            inputStyle={style.inputStyle}
            inputContainerStyle={{ borderBottomWidth: 0 }}
            style={{ marginTop: 15 }}
            labelStyle={{ color: 'black', fontWeight: 'normal' }}
            onChangeText={value => setData({ ...data, firstName: value })}
          />
          <Input
            label="Last Name *"
            value={data.lastName}
            autoCapitalize="words"
            inputStyle={style.inputStyle}
            inputContainerStyle={{ borderBottomWidth: 0 }}
            style={{ marginTop: 15 }}
            labelStyle={{ color: 'black', fontWeight: 'normal' }}
            onChangeText={value => setData({ ...data, lastName: value })}
          />
          <Input
            label="Password *"
            value={data.password}
            secureTextEntry={true}
            autoCapitalize="none"
            inputStyle={style.inputStyle}
            inputContainerStyle={{ borderBottomWidth: 0 }}
            style={{ marginTop: 15 }}
            labelStyle={{ color: 'black', fontWeight: 'normal' }}
            onChangeText={value => setData({ ...data, password: value })}
          />
          <Input
            label="Access Code *"
            value={data.accessCode}
            secureTextEntry={false}
            autoCapitalize="none"
            inputStyle={style.inputStyle}
            inputContainerStyle={{ borderBottomWidth: 0 }}
            style={{ marginTop: 15 }}
            labelStyle={{ color: 'black', fontWeight: 'normal' }}
            onChangeText={value => setData({ ...data, accessCode: value })}
          />
          <View style={{ paddingLeft: 15, paddingRight: 15 }}>
            <Text>Phone Number (Optional)</Text>
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
            onPress={() => onStateChange('signIn')}
          />
        </View>
      </ScrollView>
    );
  } else {
    return null;
  }
}

async function getCodes() {
  if (!codesGlobal.length && !sent) {
    sent = true
    let dataCall = await getCodesRemote();
    let dataJson = await dataCall;
    let retrievedData = JSON.parse(dataJson.body);
    codesGlobal = retrievedData.codes
    return retrievedData.codes
  }

  async function getCodesRemote() {
    let token = null;
    const response = await fetch(
      'https://lvwp8l3l0l.execute-api.us-west-1.amazonaws.com/p/sign-up/codes',
      {
        method: 'GET', // *GET, POST, PUT, DELETE, etc.
        mode: 'cors', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'same-origin', // include, *same-origin, omit
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
          'Authorization': token,
        },
        redirect: 'follow', // manual, *follow, error
        referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
      },
    );
    let data = await response.json(); // parses JSON response into native JavaScript objects
    console.log('data', data);
    return data;
  }
}

const style = StyleSheet.create({
  container: {
    flex: 1,
    width: wp('100'),
    height: hp('100'),
    padding: 24,
  },
  inputStyle: {
    flex: 1,
    marginTop: 5,
    borderRadius: 5,
    borderColor: '#888',
    borderWidth: 1,
    paddingLeft: 15,
  },
  buttonStyle: {
    backgroundColor: '#F86D64',
    paddingTop: 15,
    paddingBottom: 15,
    marginTop: 30,
  },
});
