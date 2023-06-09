import React, { useState, useEffect } from 'react';
import { Text, Input, Button } from 'react-native-elements';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { RFValue } from 'react-native-responsive-fontsize';
import { Auth } from 'aws-amplify';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ConfirmSignup({ authState, onStateChange }) {
  const [data, setdata] = useState({
    code: '',
    email: '',
    username: '',
    userType: 'customer',
    incoming_Id: '',
    phone: '',
    businessName: '',
    firstName: '',
    lastName: '',
    addressLine: '',
    addressCity: '',
    addressState: '',
    addressZip: '',
    instagram: '',
    admin: false,
    resetPW: false
  });

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem('userdata').then(res => {
      const userData = JSON.parse(res);
      if (isMounted)
        setdata({
          code: '',
          email: userData.email,
          username: userData.username,
          incoming_Id: userData.incoming_Id,
          userType: userData.userType,
          phone: userData.phoneNumber,
          businessName: userData.businessName,
          firstName: userData.firstName,
          lastName: userData.lastName,
          addressLine: userData.addressLine,
          addressCity: userData.addressCity,
          addressState: userData.addressState,
          addressZip: userData.addressZip,
          instagram: userData.instagram,
          admin: userData.admin,
          resetPW: userData.resetPW
        });
      seterror('');
    })
    return () => {
      console.log(data);
      isMounted = false;
    };
  }, [authState]);

  const [error, seterror] = useState('');

  const confirm = () => {
    Auth.confirmSignUp(data.username, data.code)
      .then(res => {
        getUserTable();
        onStateChange('signedUp');
        setdata({ ...data, code: '' });
        Alert.alert("Your account has successfully been made.");
      })
      .catch(err => seterror(err.message));
  };

  const resendCode = () => {
    Auth.resendSignUp(data.username)
      .then(res => { })
      .catch(err => seterror(err.message));
  };

  async function getUserTable() {
    const body = JSON.stringify({
      incoming_Id: data.incoming_Id,
      is_customer: data.userType == 'customer',
      email: data.email.toLowerCase(),
      phoneNumber: data.phone,
      businessName: data.businessName,
      firstName: data.firstName,
      lastName: data.lastName,
      addressLine: data.addressLine,
      addressCity: data.addressCity,
      addressState: data.addressState,
      addressZip: data.addressZip,
      instagram: data.instagram,
      admin: data.admin,
      resetPW: data.resetPW
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

  return authState == 'confirmSignUp' ? (
    <View style={style.container}>
      <Text h4 h4Style={{ fontSize: RFValue(18, 580) }}>
        Confirm Email
      </Text>
      <View style={{ marginTop: 15 }}>
        {error != '' && (
          <Text style={{ color: '#D65344', textAlign: 'center', marginBottom: 15 }}>
            {error}
          </Text>
        )}
        <Input
          label="Confirmation Code *"
          value={data.code}
          autoCapitalize="none"
          inputStyle={style.inputStyle}
          inputContainerStyle={{ borderBottomWidth: 0 }}
          style={{ marginTop: 15 }}
          labelStyle={{ color: 'black', fontWeight: 'normal' }}
          onChangeText={value => setdata({ ...data, code: value })}
        />
        <Button
          buttonStyle={style.buttonStyle}
          disabled={data.email === '' || data.code === ''}
          title="Confirm"
          disabledStyle={[style.buttonStyle, { opacity: 0.8 }]}
          onPress={confirm}
        />
        <View style={{ display: 'flex', flexDirection: 'row', marginTop: 25 }}>
          <TouchableOpacity
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
            onPress={resendCode}>
            <Text style={{ color: '#AAAA00', fontSize: RFValue(12, 580) }}>
              {' '}
              Resend Code
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
            onPress={() => onStateChange('signIn')}>
            <Text style={{ color: '#AAAA00', fontSize: RFValue(12, 580) }}>
              Back To Signin
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  ) : null;
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
    backgroundColor: '#D65344',
    paddingTop: 15,
    paddingBottom: 15,
    marginTop: 30,
    color: 'black'
  },
});
