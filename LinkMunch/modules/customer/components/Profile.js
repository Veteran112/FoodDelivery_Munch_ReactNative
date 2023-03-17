import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  SafeAreaView,
} from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import ProfileEditor from './subcomponents/ProfileEditor/ProfileEditor';
import { ListItem, Text, Button, Input, Icon } from 'react-native-elements';
import { EditTextAttribute } from './subcomponents/ProfileEditor/AttributeEditor';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { RFValue } from 'react-native-responsive-fontsize';
import SelectPicker from 'react-native-picker-select';
import state from './state.json';
import PhoneInput from 'react-native-phone-number-input';
import ImagePicker from 'react-native-image-crop-picker';
import RNFetchBlob from 'rn-fetch-blob';
import { updateDynamoCustomer } from './subcomponents/ProfileEditor/updateDynamoCustomer';
import Loading from 'react-native-loading-spinner-overlay';
import { CreditCardInput } from 'react-native-credit-card-input-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Auth } from 'aws-amplify';
import AWS from 'aws-sdk';
import { decode } from 'base64-arraybuffer';
import config from '../../customer/config';
import DisabledInput from "./subcomponents/DisabledInput";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { checkoutContext } from '../context/CheckoutContext';

var profile;
var credit;
const Stack = createStackNavigator();

export default class Profile extends React.Component {
  constructor(props) {
    super(props);
    Auth.currentUserInfo();
    this.state = {
      signedIn: false,
      name: '',
      profile: props.route.params.data,
      credit: parseFloat(props.route.params.data.credit) ?? 0
    };
    profile = this.state.profile;
    credit = this.state.credit - checkoutContext.appliedCredit;
  }

  editProfile = newProfile => {
    this.setState({ profile: newProfile });
  };

  render() {
    return (
      <Stack.Navigator initialRouteName="Profile">
        <Stack.Screen
          name="User Profile"
          component={Edit}
          initialParams={{
            profile: this.state.profile,
            needsUpdate: false,
          }}
          options={({ navigation, route }) => ({
            headerTitleAlign: 'center',
            headerRight: props =>
              !route.params.edit ? (
                <Button
                  icon={<Icon name="pencil" type="simple-line-icon" color="#E82800" style={{ paddingRight: 5 }} />}
                  titleStyle={{ color: '#E82800' }}
                  title="Edit"
                  type="clear"
                  onPress={() => navigation.setParams({ edit: true })}
                />
              ) : (
                <></>
              ),
          })}
        />
        <Stack.Screen
          name="Payment Method"
          component={PaymentMethod}
          initialParams={{
            profile: this.state.profile,
          }}
          options={({ navigation, route }) => ({
            headerTitleAlign: 'center',
            headerLeft: props => (
              <Button
                icon={
                  <Icon
                    name="chevron-thin-left"
                    type="entypo"
                    size={15}
                    color="#E82800"
                  />
                }
                title="Back"
                style={styles.categoryEditorButton}
                titleStyle={{ color: '#E82800' }}
                type="clear"
                onPress={() => {
                  Alert.alert(
                    'Unsaved Changes',
                    'Are you sure you want to cancel any payment edits made?',
                    [
                      {
                        text: 'Ok',
                        onPress: () => {
                          navigation.goBack();
                        },
                      },
                      { text: 'Cancel' },
                    ],
                  );
                }}
              />
            ),
          })}
        />
        <Stack.Screen
          name="Editor"
          component={EditProfile}
          initialParams={{
            item: this.state.profile,
          }}
          options={({ navigation }) => ({
            headerTitleAlign: 'center',
            title: 'Profile Editor',
          })}
        />
        <Stack.Screen
          name="ProfileEditor"
          component={ProfileEditor}
          options={({ navigation }) => ({
            title: 'Profile Editor',
            headerTitleAlign: 'center',
            headerTitleStyle: {
              color: 'black',
            },
            headerTintColor: '#E82800',
          })}
        />
      </Stack.Navigator>
    );
  }
}

const PaymentMethod = ({ navigation, route }) => {
  const [valid, setValid] = useState(false);
  const [card, setCard] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: '',
  });

  const onChangeCard = form => {
    setValid(form.valid);
    setCard(form.values);
  };

  const submitMethod = async () => {
    if (valid) {
      let profile = route.params.profile;
      let cardInfo = {
        cardNumber: card.number,
        cardType: card.type,
        cvv: card.cvc, // ? cvv
        expirationMonth: parseInt(card.expiry.split('/')[0]),
        expirationYear: parseInt(card.expiry.split('/')[1]),
        nameOnCard: 'order',
      };
      let isExisting = false;
      for (let card of profile.paymentOptions.cards) {
        if (card.cardNumber == cardInfo.cardNumber) {
          isExisting = true; break;
        }
      }
      if (!isExisting) {
        profile.paymentOptions.cards = [cardInfo, ...profile.paymentOptions.cards];
      }

      profile.paymentOptions.default = cardInfo;
      await AsyncStorage.setItem("@CARD", JSON.stringify(cardInfo));
      navigation.navigate('User Profile', { profile: profile, update: false });
      Alert.alert("Payment successfully saved.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}>
        <View style={{ padding: 24 }}>
          <Text h4 style={styles.titles}>
            Add Payment Method
          </Text>
          <View style={{ flex: 1, marginTop: 50, height: 450 }}>
            <CreditCardInput
              requiresName={true}
              useVertical={true}
              allowScroll={true}
              requiresCvc={true}
              imageFront={false}
              imageBack={false}
              cardScale={0}
              labels={{
                expiry: 'Expiration',
                name: 'Name',
                cvc: 'CVC',
                number: 'Card Number',
              }}
              onChange={onChangeCard}
            />
          </View>
          <Button
            buttonStyle={styles.buttonStyle}
            title="Save Payment Method"
            onPress={submitMethod}
          />
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

function Edit({ navigation, route }) {
  const originalEmail = profile.customerInfo.contactInformation.emailAddress;
  const [image, setImage] = useState(null);
  const [profiledata, setProfiledata] = useState(profile);
  const [loading, setloading] = useState(false);
  const [userCredit, setUserCredit] = useState(credit)

  useEffect(() => {
    if (route.params.edit) {
      setImage(null);
    }
  }, [route.params.edit]);

  useEffect(() => {
    if (route.params.update) {
      navigation.setParams({ update: false });
      setProfiledata(route.params.profile);
      saveprofile(route.params.profile);
    }
  }, [navigation, route.params.profile, route.params.update, saveprofile]);

  const updateimage1 = (keyString, blob) => {
    return new Promise((resolve, reject) => {
      var s3 = new AWS.S3({
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      });

      let body = decode(blob);

      s3.upload(
        {
          Bucket: config.bucket,
          Key: keyString,
          Body: body,
          ContentType: 'image/jpg',
          ACL: 'public-read',
        },
        (err, data) => {
          console.log(err);
          if (!err) {
            resolve(data.Location);
          } else {
            reject(err);
          }
        },
      );
    });
  };

  const uploadS3bucket = async () => {
    let blob = await RNFetchBlob.fs.readFile(image.uri, 'base64');
    const info = await Auth.currentUserInfo();
    let keyString =
      'customers/' + info.username + '/' + new Date().getTime() + '.jpg';

    return await updateimage1(keyString, blob);
  };

  const openpicker = () => {
    if (route.params.edit) {
      ImagePicker.openPicker({}).then(res => {
        setImage({
          uri: res.path,
          filename: res.filename,
          type: res.mime,
        });
      });
    }
  };

  const saveprofile = useCallback(async profile => {
    try {
      setloading(true);

      let profileinfo = { ...profile };
      if (image) {
        let picture = await uploadS3bucket();
        profileinfo.customerInfo.picture = picture;
      }

      setImage(null);

      if (originalEmail != profileinfo.customerInfo.contactInformation.emailAddress) {
        let user = await Auth.currentAuthenticatedUser();
        user.session = user.signInUserSession;
        const newAttribute = { email: profileinfo.customerInfo.contactInformation.emailAddress };
        let res = await Auth.updateUserAttributes(user, newAttribute);

        if (res == "SUCCESS") {
          Alert.prompt(
            "Enter confirmation code",
            "An email has been sent with your confirmation code.",
            [
              {
                text: "Cancel",
                onPress: async () => {
                },
              },
              {
                text: "OK",
                onPress: async (txt) => {
                  let result = await Auth.verifyCurrentUserAttributeSubmit("email", txt);
                  console.log("⚠️ Profile.js", result);

                  if (result == "SUCCESS") {
                    Alert.alert("Your email has successfully been updated.");
                  } else {
                    Alert.alert("Confirmation was failed. Please input correct confirmation code.");
                  }
                }
              }
            ],

          );
        }

      }
      updateDynamoCustomer(profileinfo);
      setloading(false);
      navigation.setParams({ edit: false });
    } catch (e) {
      console.log("⚠️ ERROR", e);
      setloading(false);
    }
  });

  const remove = () => {
    Alert.alert('Delete Profile?', 'Do you want to delete your account?  This can only be done if you have no credit balance or outstanding cashout request!', [
      { text: 'Ok', onPress: removeProfile },
      { text: 'Cancel' },
    ]);
  };

  const removeProfile = () => {
    Auth.currentUserInfo().then(async user => {
      const body = {
        incomingId: user.attributes.sub,
      };
      const response = await fetch(
        'https://lvwp8l3l0l.execute-api.us-west-1.amazonaws.com/p/delete',
        {
          method: 'DELETE', // *GET, POST, PUT, DELETE, etc.
          mode: 'cors', // no-cors, *cors, same-origin
          cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
          credentials: 'same-origin', // include, *same-origin, omit
          headers: {
            'Content-Type': 'application/json',
            'Connection': 'keep-alive',
          },
          redirect: 'follow', // manual, *follow, error
          referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
          body: JSON.stringify(body), // body data type must match “Content-Type” header
        },
      );

      Auth.currentAuthenticatedUser().then(u => {
        u.deleteUser(error => { });
        Auth.signOut();
      });
    })
  }

  const isEditMode = route.params.edit;
  return (
    <ScrollView>
      <View style={styles.general}>
        <Text h4 style={styles.titles}>
          User Information
        </Text>
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            padding: 10,
            alignItems: 'center',
          }}>
          <TouchableOpacity style={[styles.picture]} onPress={openpicker}>
            {image || profiledata.customerInfo.picture ? (
              <Image
                source={{
                  uri:
                    image && route.params.edit
                      ? image.uri
                      : profiledata.customerInfo.picture +
                      '?date=' +
                      new Date().getTime(),
                }}
                style={styles.picture}
              />
            ) : (
              <Icon name="image" size={RFValue(30, 580)} />
            )}
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            {isEditMode ? (
              <Input
                label="First Name"
                inputContainerStyle={{ borderBottomWidth: 0 }}
                placeholder="First Name"
                disabled={!route.params.edit}
                value={profiledata.customerInfo.customerName.firstName}
                onChangeText={value =>
                  setProfiledata({
                    ...profiledata,
                    customerInfo: {
                      ...profiledata.customerInfo,
                      customerName: {
                        ...profiledata.customerInfo.customerName,
                        firstName: value,
                      },
                    },
                  })
                }
                inputStyle={styles.input}
              />
            ) : (
              <DisabledInput
                label={'First Name'}
                value={profiledata.customerInfo.customerName.firstName}
              />
            )}

            {isEditMode ? (
              <Input
                label="Last Name"
                inputContainerStyle={{ borderBottomWidth: 0 }}
                placeholder="Last Name"
                disabled={!route.params.edit}
                value={profiledata.customerInfo.customerName.lastName}
                onChangeText={value =>
                  setProfiledata({
                    ...profiledata,
                    customerInfo: {
                      ...profiledata.customerInfo,
                      customerName: {
                        ...profiledata.customerInfo.customerName,
                        lastName: value,
                      },
                    },
                  })
                }
                inputStyle={styles.input}
              />
            ) : (
              <DisabledInput
                label={'Last Name'}
                value={profiledata.customerInfo.customerName.lastName}
              />
            )}
          </View>
        </View>
        <View>
          {isEditMode ? (
            <Input
              label="Customer Address"
              inputContainerStyle={{ borderBottomWidth: 0 }}
              placeholder="Address"
              disabled={!route.params.edit}
              value={profiledata.customerInfo.address?.address}
              onChangeText={value =>
                setProfiledata({
                  ...profiledata,
                  customerInfo: {
                    ...profiledata.customerInfo,
                    address: {
                      ...profiledata.customerInfo.address,
                      address: value,
                    },
                  },
                })
              }
              inputStyle={styles.input}
            />
          ) : (
            <DisabledInput
              label={'Customer Address'}
              value={profiledata.customerInfo.address?.address}
            />
          )}

          {isEditMode ? (
            <Input
              label="Customer City"
              inputContainerStyle={{ borderBottomWidth: 0 }}
              placeholder="Customer City"
              disabled={!route.params.edit}
              value={profile.customerInfo.address?.city}
              onChangeText={value =>
                setProfiledata({
                  ...profiledata,
                  customerInfo: {
                    ...profiledata.customerInfo,
                    address: {
                      ...profiledata.customerInfo.address,
                      city: value,
                    },
                  },
                })
              }
              inputStyle={styles.input}
            />
          ) : (
            <DisabledInput
              label={'Customer City'}
              value={profile.customerInfo.address?.city}
            />
          )}

          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
            <View style={{ width: '45%' }}>
              {isEditMode ? (
                <SelectPicker
                  items={Object.keys(state).map(item => ({
                    label: state[item],
                    value: item,
                  }))}
                  placeholder={{ label: 'State' }}
                  textInputProps={{
                    style: {
                      width: wp('100') / 2,
                      height: 40,
                      marginLeft: 15,
                      backgroundColor: 'white',
                      borderRadius: 8,
                      borderColor: '#AAA',
                      borderWidth: 1,
                      padding: 5,
                      fontSize: RFValue(15, 580),
                      color: '#888',
                    },
                  }}
                  style={{
                    backgroundColor: 'white',
                  }}
                  value={profiledata.customerInfo.address?.state}
                  onValueChange={value =>
                    setProfiledata({
                      ...profiledata,
                      customerInfo: {
                        ...profiledata.customerInfo,
                        address: {
                          ...profiledata.customerInfo.address,
                          state: value,
                        },
                      },
                    })
                  }
                  disabled={!route.params.edit}
                />
              ) : (
                <DisabledInput
                  label={'State'}
                  value={profiledata.customerInfo.address?.state}
                />
              )}

            </View>
            <View style={{ width: '45%' }}>
              {isEditMode ? (
                <Input
                  label="Zip Code"
                  inputStyle={styles.input}
                  placeholder="Zip Code"
                  inputContainerStyle={{ borderBottomWidth: 0 }}
                  disabled={!route.params.edit}
                  value={profiledata.customerInfo.address?.zipcode}
                  onChangeText={value =>
                    setProfiledata({
                      ...profiledata,
                      customerInfo: {
                        ...profiledata.customerInfo,
                        address: {
                          ...profiledata.customerInfo.address,
                          zipcode: value,
                        },
                      },
                    })
                  }
                />
              ) : (
                <DisabledInput
                  label={'Zip Code'}
                  value={profiledata.customerInfo.address?.zipcode}
                />
              )}
            </View>
          </View>
          {isEditMode ? (
            <Input
              label="Email Address"
              autoCapitalize="none"
              inputStyle={styles.input}
              placeholder="Email Address"
              inputContainerStyle={{ borderBottomWidth: 0 }}
              disabled={!route.params.edit}
              value={profiledata.customerInfo.contactInformation.emailAddress}
              onChangeText={value =>
                setProfiledata({
                  ...profiledata,
                  customerInfo: {
                    ...profiledata.customerInfo,
                    contactInformation: {
                      ...profiledata.customerInfo.contactInformation,
                      emailAddress: value,
                    },
                  },
                })
              }
            />
          ) : (
            <DisabledInput
              label={'Email Address'}
              value={profiledata.customerInfo.contactInformation.emailAddress}
            />
          )}
          <View>
            {isEditMode ? (
              <TouchableOpacity
                onPress={() => {
                  navigation.navigate('Payment Method');
                }}
              >
                <Input
                  label="Payment"
                  autoCapitalize="none"
                  inputStyle={styles.input}
                  placeholder={profiledata.paymentOptions?.default?.cardNumber ? '**** **** **** *' + profiledata.paymentOptions?.default?.cardNumber.toString().slice(-3) : ''}
                  inputContainerStyle={{ borderBottomWidth: 0 }}
                  disabled={!route.params.edit}
                  value={profiledata.paymentOptions?.default?.cardNumber ? '**** **** **** *' + profiledata.paymentOptions?.default?.cardNumber.toString().slice(-3) : ''}
                />
                <View style={{ ...styles.input, backgroundColor: 'clear', position: 'absolute', width: "100%", height: '80%', borderWidth: 0 }} />
              </TouchableOpacity>
            ) : (
              <DisabledInput
                label={'Payment'}
                value={profiledata.paymentOptions?.default?.cardNumber ? '**** **** **** *' + profiledata.paymentOptions?.default?.cardNumber.toString().slice(-3) : ''}
              />
            )}
          </View>
          <View>
            {isEditMode ? (
              <View style={{ marginLeft: 15, marginRight: 15 }}>
                <Text style={{ fontSize: RFValue(12, 580), color: '#888' }}>
                  Phone Number
                </Text>
                <PhoneInput
                  defaultCode="US"
                  containerStyle={{
                    width: wp('100') - 30,
                    backgroundColor: 'white',
                    borderColor: '#979797',
                    borderWidth: 1,
                  }}
                  disabled={!route.params.edit}
                  value={
                    profiledata.customerInfo.contactInformation.contactNumber
                      .phoneNumber
                  }
                  onChangeText={value =>
                    setProfiledata({
                      ...profiledata,
                      customerInfo: {
                        ...profiledata.customerInfo,
                        contactInformation: {
                          ...profiledata.customerInfo.contactInformation,
                          contactNumber: {
                            ...profiledata.customerInfo.contactInformation
                              .contactNumber,
                            phoneNumber: value,
                          },
                        },
                      },
                    })
                  }
                />
              </View>
            ) : (
              <DisabledInput
                label={'Phone Number'}
                value={profiledata.customerInfo.contactInformation.contactNumber.phoneNumber}
              />
            )}
          </View>
          {!route.params.edit && userCredit >= 5 && (
            <View style={styles.creditButtonContainer}>
              <Button
                title={`Transfer Credit:  $${userCredit.toFixed(2)}`}
                onPress={() =>
                  Alert.alert(
                    'Are you sure?',
                    'You will no longer be able to use this credit inside of LinkMunch.',
                    [
                      {
                        text: 'Ok',
                        onPress: () => {
                          transferCredit(userCredit, profiledata.CustomerId);
                          credit = 0
                          setUserCredit(0)
                        },
                      },
                      { text: 'Cancel' },
                    ],
                  )
                }
                buttonStyle={styles.creditButtonStyle}
              />
            </View>
          )}
          {route.params.edit ? (
            <View style={styles.buttoncontainer}>
              <Button
                title="Cancel"
                type="outline"
                onPress={() => navigation.setParams({ edit: false })}
                buttonStyle={[
                  styles.buttonStyle,
                  {
                    marginBottom: 15,
                    backgroundColor: 'white',
                    borderColor: '#888',
                  },
                ]}
                titleStyle={{ color: '#888' }}
              />
              <Button
                title="Save & Update"
                onPress={() => saveprofile(profiledata)}
                buttonStyle={styles.buttonStyle}
              />
            </View>
          ) : (
            <Button
              buttonStyle={styles.buttonStyle}
              style={{ marginLeft: 15, marginRight: 15, marginTop: 15 }}
              title="Sign Out"
              titleStyle={styles.titleStyle}
              onPress={() => Auth.signOut()}
            />
          )}
          <View
            style={[styles.rowCenter, { justifyContent: 'center', paddingTop: 20 }]}>
            <Text style={styles.titles} onPress={remove}>DELETE Profile</Text>
          </View>
        </View>
        <Loading visible={loading} />
      </View>
    </ScrollView>
  );
}

function EditProfile({ navigation, route }) {
  return (
    <EditTextAttribute
      navigation={navigation}
      item={route.params.item}
      attribute={route.params.attribute}
      toChange={route.params.toChange}
    />
  );
}

async function transferCredit(credit, customerId) {
  const body = JSON.stringify({
    credit,
    customer_id: customerId
  });

  const response = await fetch(
    'https://d3hs3h7gv0.execute-api.us-west-1.amazonaws.com/beta/update/credit',
    {
      method: 'PATCH', // *GET, POST, PUT, DELETE, etc.
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

  console.log(dataResponse.success);
  return dataResponse;
}

const styles = StyleSheet.create({
  general: {
    flex: 1,
    justifyContent: 'center',
    textAlign: 'center',
  },
  titles: {
    textAlign: 'center',
    color: '#E82800',
    padding: 10,
    fontWeight: "600"
  },
  signOutButton: {
    marginTop: 50,
    padding: 15,
  },
  titleStyle: {
    fontWeight: "600"
  },
  picture: {
    width: wp('30'),
    height: wp('30'),
    borderRadius: 15,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    backgroundColor: 'white',
    borderColor: '#979797',
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 11,
    paddingTop: 8,
    paddingBottom: 8,
  },
  cardcontainer: {
    padding: 5,
    paddingLeft: 15,
    paddingRight: 15,
    backgroundColor: 'white',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#979797',
    display: 'flex',
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
    marginLeft: 15,
    marginRight: 15,
  },
  buttonStyle: {
    backgroundColor: '#fb322d',
    paddingTop: 15,
    paddingBottom: 15,
    borderRadius: 5
  },
  creditButtonStyle: {
    backgroundColor: '#f66b00',
    paddingTop: 5,
    paddingBottom: 5,
    borderRadius: 5
  },
  buttoncontainer: {
    padding: 15,
    paddingBottom: 0,
  },
  creditButtonContainer: {
    padding: 15,
    paddingBottom: 0,
  },
  check: {
    width: RFValue(30, 580),
    height: RFValue(30, 580),
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RFValue(15, 580),
    borderWidth: 1,
    borderColor: '#F86D64',
  },
  /* Modal */
  modalInputStyle: {
    flex: 1,
    marginTop: 5,
    borderRadius: 5,
    borderColor: '#888',
    borderWidth: 1,
    paddingLeft: 15,
  },
  modalButtonStyle: {
    backgroundColor: '#F86D64',
    paddingTop: 15,
    paddingBottom: 15,
    marginTop: 30,
  },
})