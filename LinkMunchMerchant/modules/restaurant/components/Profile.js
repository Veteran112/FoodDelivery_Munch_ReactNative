import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { ListItem, Text, Card, Button, Input, Icon } from 'react-native-elements';
import { Auth } from 'aws-amplify';
import ImagePicker from 'react-native-image-crop-picker';
import { updateDynamoRestaurant } from './subcomponents/ProfileEditor/updateDynamoRest';
import RNFetchBlob from 'rn-fetch-blob';
import state from './state.json';
import { RFValue } from 'react-native-responsive-fontsize';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import Loading from 'react-native-loading-spinner-overlay';
import Picker from 'react-native-picker-select';
import { Alert } from 'react-native';
import AWS from 'aws-sdk';
import { decode } from 'base64-arraybuffer';
import config from '../config';
import Styles from "../../theme/Styles";
import Dialog from "react-native-dialog";

var profile;
var id;
const Stack = createStackNavigator();

export default class Profile extends React.Component {
  constructor(props) {
    super(props);

    profile = props.route.params.data
    id = props.route.params.id
    this.state = {
      profile: profile,
    };
  }

  editProfile = newProfile => {
    this.setState({ profile: newProfile });
  };

  render() {
    return (
      <Stack.Navigator initialRouteName="Profile">
        <Stack.Screen
          name="Profile"
          component={EditProfile}
          initialParams={{
            profile: this.state.profile,
            needsUpdate: false,
          }}
          options={({ navigation, route }) => ({
            title: 'Profile',
            headerRight: props =>
              !route.params.edit ? (
                <Button
                  icon={<Icon name="create" color="#D65344" />}
                  titleStyle={{ color: '#D65344' }}
                  title="Edit"
                  type="clear"
                  onPress={() => navigation.setParams({ edit: true })}
                />
              ) : (
                <></>
              ),
            headerTitleAlign: 'center',
            headerTitleStyle: {},
          })}
        />
        <Stack.Screen
          name="ResetPassword"
          component={ResetPassword}
          options={{
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    );
  }
}

function EditProfile({ navigation, route }) {
  let self = this;
  const [loading, setloading] = useState(false);
  const [profiledata, setprofiledata] = useState(profile);
  const [image, setImage] = useState(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [tempPW, setTempPW] = useState("")
  const [dialogError, setDialogError] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const windowWidth = Dimensions.get('window').width;
  const selectPicker = useRef(null);
  const originalEmail = route.params.profile.restaurantInfo.restaurantEmail;
  const admin = profiledata.restaurantInfo.admin ?? false;

  const updateimage1 = async (keyString, blob) => {
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
          setImage({
            ...image,
            uri: data.Location
          })
          profile = ({ ...profiledata, picture: data.Location });
          setprofiledata({ ...profiledata, picture: data.Location })
          console.log("3")
          console.log(profile)
          saveprofile2()
          return profile;
        } else {
          console.log(err)
          return profiledata;
        }
      },
    );
  };

  const uploadS3bucket = async () => {
    let blob = await RNFetchBlob.fs.readFile(image.uri, 'base64');
    const info = await Auth.currentUserInfo();
    let keyString =
      'restaurants/' + info.attributes.sub + '/' + Date.now().toString() + '_profile_pic.jpg';
    await updateimage1(keyString, blob);
  };

  const saveprofile = async () => {
    try {
      setloading(true);

      if (image) {
        uploadS3bucket()
      } else {
        saveprofile2()
      }

    } catch (e) {
      setloading(false);
    }
  };

  const saveprofile2 = async () => {
    console.log("1")
    console.log(profile)
    if (originalEmail != profiledata.restaurantInfo.restaurantEmail) {
      let user = await Auth.currentAuthenticatedUser();
      user.session = user.signInUserSession;
      const newAttribute = { email: profiledata.restaurantInfo.restaurantEmail };
      let res = await Auth.updateUserAttributes(user, newAttribute);
      console.log("⚠️ res", res);
      if (res == "SUCCESS") {
        Alert.prompt(
          "Enter confirmation code",
          "An email has been sent with your confirmation code.",
          [
            {
              text: "Cancel",
              onPress: () => console.log("Cancel Pressed"),
              style: "cancel"
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

    updateDynamoRestaurant(id, profile);
    setloading(false);
    navigation.setParams({ edit: false });
  }

  const openpicker = () => {
    ImagePicker.openPicker({}).then(res => {
      setImage({
        uri: res.path,
        type: res.mime,
        filename: res.path.split('/').pop(),
      });
    });
  };

  const removeProfile = () => {
    Auth.currentUserInfo().then(async user => {
      const body = {
        incomingId: user.attributes.sub,
      };
      const response = await fetch(
        'https://9yl3ar8isd.execute-api.us-west-1.amazonaws.com/beta/restaurants/deleterestaurant',
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
          body: JSON.stringify(body), // body data type must match “Content-Type” header
        },
      );

      Auth.currentAuthenticatedUser().then(user => {
        user.deleteUser(error => { });
        Auth.signOut();
      });
    });
  };

  const remove = () => {
    Alert.alert('Delete Restaurant', 'Do you want to delete this restaurant?', [
      { text: 'Ok', onPress: removeProfile },
      { text: 'Cancel' },
    ]);
  };

  return (
    <ScrollView>
      <View>
        <Text h4 style={styles.titles} h4Style={{ fontSize: RFValue(15, 580), marginTop: 10 }}>
          Restaurant Information
        </Text>
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            padding: 10,
            alignItems: 'flex-start',
          }}>
          <TouchableOpacity style={[styles.picture]} onPress={route.params.edit ? openpicker : null}>
            {image || profiledata.picture ? (
              <Image
                source={{
                  uri:
                    image
                      ? image.uri
                      : profiledata.picture,
                }}
                style={styles.picture}
              />
            ) : (
              <Icon name="mood" size={RFValue(30, 580)} />
            )}
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <View>
              <Input
                containerStyle={{ height: 70 }}
                label="Restaurant Name"
                inputStyle={styles.input}
                inputContainerStyle={{ borderBottomWidth: 0 }}
                placeholder="Restaurant Name"
                disabled={!route.params.edit}
                value={profiledata.restaurantInfo.restaurantName}
                onChangeText={value => {
                  profile = ({
                    ...profiledata,
                    restaurantInfo: {
                      ...profiledata.restaurantInfo,
                      restaurantName: value,
                    },
                  });
                  setprofiledata({
                    ...profiledata,
                    restaurantInfo: {
                      ...profiledata.restaurantInfo,
                      restaurantName: value,
                    },
                  })
                }}
              />
              <Input
                containerStyle={{ height: 70 }}
                label="Restaurant Email"
                inputStyle={styles.input}
                inputContainerStyle={{ borderBottomWidth: 0 }}
                placeholder="Restaurant Email"
                autoCapitalize={'none'}
                disabled={!route.params.edit}
                value={profiledata.restaurantInfo.restaurantEmail}
                onChangeText={value =>{
                  profile = ({
                    ...profiledata,
                    restaurantInfo: {
                      ...profiledata.restaurantInfo,
                      restaurantEmail: value,
                    },
                  });
                  setprofiledata({
                    ...profiledata,
                    restaurantInfo: {
                      ...profiledata.restaurantInfo,
                      restaurantEmail: value,
                    },
                  })
                }}
              />
              <Input
                containerStyle={{ height: 70 }}
                label="Facebook"
                inputStyle={styles.input}
                inputContainerStyle={{ borderBottomWidth: 0 }}
                placeholder="Facebook link"
                autoCapitalize={'none'}
                placeholderTextColor={'#ccc'}
                disabled={!route.params.edit}
                value={profiledata.restaurantInfo.restaurantFacebook}
                onChangeText={value =>{
                  profile = ({
                    ...profiledata,
                    restaurantInfo: {
                      ...profiledata.restaurantInfo,
                      restaurantFacebook: value,
                    },
                  });
                  setprofiledata({
                    ...profiledata,
                    restaurantInfo: {
                      ...profiledata.restaurantInfo,
                      restaurantFacebook: value,
                    },
                  })
                }}
              />
              <Input
                containerStyle={{ height: 70 }}
                label="Instagram"
                inputStyle={styles.input}
                inputContainerStyle={{ borderBottomWidth: 0 }}
                placeholder="Instagram link"
                autoCapitalize={'none'}
                placeholderTextColor={'#ccc'}
                disabled={!route.params.edit}
                value={profiledata.restaurantInfo.restaurantInstagram}
                onChangeText={value =>{
                  profile = ({
                    ...profiledata,
                    restaurantInfo: {
                      ...profiledata.restaurantInfo,
                      restaurantInstagram: value,
                    },
                  });
                  setprofiledata({
                    ...profiledata,
                    restaurantInfo: {
                      ...profiledata.restaurantInfo,
                      restaurantInstagram: value,
                    },
                  })
                }}
              />
              <Input
                containerStyle={{ height: 70 }}
                label="Restaurant Phone Number"
                inputStyle={styles.input}
                inputContainerStyle={{ borderBottomWidth: 0 }}
                placeholder="Restaurant Phone Number"
                disabled={!route.params.edit}
                value={profiledata.restaurantInfo.restaurantPhoneNumber}
                onChangeText={value =>{
                  profile = ({
                    ...profiledata,
                    restaurantInfo: {
                      ...profiledata.restaurantInfo,
                      restaurantPhoneNumber: value,
                    },
                  });
                  setprofiledata({
                    ...profiledata,
                    restaurantInfo: {
                      ...profiledata.restaurantInfo,
                      restaurantPhoneNumber: value,
                    },
                  })
                }}
              />
            </View>
          </View>
        </View>
        <View>
          <Input
            label="Restaurant Address"
            inputStyle={styles.input}
            inputContainerStyle={{ borderBottomWidth: 0 }}
            placeholder="Restaurant Address"
            disabled={!route.params.edit}
            value={profiledata.restaurantInfo.restaurantAddress.address}
            onChangeText={value =>{
              profile = ({
                ...profiledata,
                restaurantInfo: {
                  ...profiledata.restaurantInfo,
                  restaurantAddress: {
                    ...profiledata.restaurantAddress,
                    address: value,
                  },
                },
              });
              setprofiledata({
                ...profiledata,
                restaurantInfo: {
                  ...profiledata.restaurantInfo,
                  restaurantAddress: {
                    ...profiledata.restaurantAddress,
                    address: value,
                  },
                },
              })
            }}
          />
          <Input
            label="Restaurant City"
            inputStyle={styles.input}
            inputContainerStyle={{ borderBottomWidth: 0 }}
            placeholder="Restaurant City"
            disabled={!route.params.edit}
            value={profiledata.restaurantInfo.restaurantAddress.city}
            onChangeText={value =>{
              profile = ({
                ...profiledata,
                restaurantInfo: {
                  ...profiledata.restaurantInfo,
                  restaurantAddress: {
                    ...profiledata.restaurantAddress,
                    city: value,
                  },
                },
              });
              setprofiledata({
                ...profiledata,
                restaurantInfo: {
                  ...profiledata.restaurantInfo,
                  restaurantAddress: {
                    ...profiledata.restaurantAddress,
                    city: value,
                  },
                },
              })
            }}
          />
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
            }}>
            <View>
              <Picker
                ref={selectPicker}
                pickerProps={{
                  accessibilityLabel: 'State',
                }}
                value={profiledata.restaurantInfo.restaurantAddress.state}
                items={Object.keys(state).map(item => ({
                  label: state[item],
                  value: item,
                }))}
                placeholder={{ label: 'State' }}
                textInputProps={{
                  style: {
                    width: windowWidth / 2,
                    height: 44,
                    marginLeft: 15,
                    borderRadius: 8,
                    borderColor: '#AAA',
                    borderWidth: 1,
                    padding: 5,
                    fontSize: RFValue(15, 580),
                    color: '#888',
                  },
                }}
                onValueChange={value => {
                  profile = ({
                    ...profiledata,
                    restaurantInfo: {
                      ...profiledata.restaurantInfo,
                      restaurantAddress: {
                        ...profiledata.restaurantAddress,
                        state: value,
                      },
                    },
                  });
                  //change dropdown
                  setprofiledata({
                    ...profiledata,
                    restaurantInfo: {
                      ...profiledata.restaurantInfo,
                      restaurantAddress: {
                        ...profiledata.restaurantAddress,
                        state: value,
                      },
                    },
                  });
                }}
                disabled={!route.params.edit}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Zip Code"
                inputStyle={styles.input}
                inputContainerStyle={{ borderBottomWidth: 0 }}
                placeholder="Zip Code"
                disabled={!route.params.edit}
                value={profiledata.restaurantInfo.restaurantAddress.zipcode}
                onChangeText={value =>{
                  profile = ({
                    ...profiledata,
                    restaurantInfo: {
                      ...profiledata.restaurantInfo,
                      restaurantAddress: {
                        ...profiledata.restaurantAddress,
                        zipcode: value,
                      },
                    },
                  });
                  setprofiledata({
                    ...profiledata,
                    restaurantInfo: {
                      ...profiledata.restaurantInfo,
                      restaurantAddress: {
                        ...profiledata.restaurantAddress,
                        zipcode: value,
                      },
                    },
                  })
                }}
              />
            </View>
          </View>
        </View>
        {route.params.edit ? (
          <>
            <Text h4 style={styles.titles}>
              Delivery Options
            </Text>
            <Input
              label="Delivery Radius"
              inputStyle={styles.input}
              inputContainerStyle={{ borderBottomWidth: 0 }}
              value={profiledata.deliveryOptions.maxRadius}
              keyboardType="number-pad"
              onChangeText={value =>{
                profile = ({
                  ...profiledata,
                  deliveryOptions: {
                    ...profiledata.deliveryOptions,
                    maxRadius: value,
                  },
                });
                setprofiledata({
                  ...profiledata,
                  deliveryOptions: {
                    ...profiledata.deliveryOptions,
                    maxRadius: value,
                  },
                })
              }}
            />
            <Input
              label="Delivery Fees"
              inputStyle={styles.input}
              inputContainerStyle={{ borderBottomWidth: 0 }}
              value={profiledata.deliveryOptions.additionalDeliveryFee}
              keyboardType="numeric"
              onChangeText={value =>{
                profile = ({
                  ...profiledata,
                  deliveryOptions: {
                    ...profiledata.deliveryOptions,
                    additionalDeliveryFee: value,
                  },
                });
                setprofiledata({
                  ...profiledata,
                  deliveryOptions: {
                    ...profiledata.deliveryOptions,
                    additionalDeliveryFee: value,
                  },
                })
              }}
            />
            <Text
              style={styles.titles}
              onPress={() => {
                navigation.navigate("ResetPassword");
              }}
            >
              Reset Password
            </Text>
          </>
        ) : (
          <>
            <Text h4 style={styles.titles}>
              Delivery Options
            </Text>
            <ListItem
              title={'Flat Fee: $' + profiledata.deliveryOptions?.flatFee}
              bottomDivider
              chevron
            />
            <ListItem
              title={
                'Flat Fee Radius: ' +
                profiledata.deliveryOptions?.flatFeeRadius +
                ' mile(s)'
              }
              bottomDivider
              chevron
            />
            <ListItem
              title={
                'Delivery Radius: ' +
                profiledata.deliveryOptions?.maxRadius +
                ' mile(s)'
              }
              bottomDivider
              chevron
            />
            <ListItem
              title={
                'Delivery Fees: $' +
                profiledata.deliveryOptions?.additionalDeliveryFee +
                '/mile'
              }
              bottomDivider
              chevron
            />
          </>
        )}

        {route.params.edit ? (
          <View style={styles.buttoncontainer}>
            <Button
              title="Save & Update"
              onPress={saveprofile}
              buttonStyle={[
                styles.buttonStyle,
                {
                  marginBottom: 15,
                }
              ]}
            />
            <Button
              title="Cancel"
              type="outline"
              onPress={() => navigation.setParams({ edit: false })}
              buttonStyle={[
                styles.buttonStyle,
                {
                  backgroundColor: 'white',
                  borderColor: '#888',
                },
              ]}
              titleStyle={{ color: '#888' }}
            />

            <View
              style={[Styles.rowCenter, { justifyContent: 'center' }]}>
              <Icon name="delete" color="red" raised onPress={remove} />
              <Text style={styles.titles}>DELETE Restaurant</Text>
            </View>
          </View>
        ) : (
          <View style={{ paddingLeft: 15, paddingRight: 15 }}>
            <Button
              buttonStyle={styles.buttonStyle}
              style={styles.signOutButton}
              title={'Sign Out'}
              onPress={() => Auth.signOut()}
            />
          </View>
        )}
        {admin && (
          <Button
            buttonStyle={styles.bbuttonStyle}
            style={styles.signOutButton}
            title={'Release Profile to Merchant'}
            onPress={() => {
              console.log("pressed")
              setDialogVisible(true)
            }}
          />
        )}
        {/* <Loading visible={loading} /> */}

        <Dialog.Container visible={dialogVisible}>
          <Dialog.Title>Release Profile</Dialog.Title>
          <Dialog.Description>
            Please check that profile account information and menu is accurate before releasing Link Munch Merchant account.
            {dialogError != "" && (
              <Text style={{ color: '#D65344' }}>
                {"\n"}{"\n"}{dialogError}
              </Text>
            )}
          </Dialog.Description>
          <Text style={{ paddingLeft: "8%", paddingBottom: 2 }}>
            Current password:
          </Text>
          <Dialog.Input
            value={tempPW}
            autoCapitalize="none"
            onChangeText={value => setTempPW(value)}
          />
          <Text style={{ paddingLeft: "8%", paddingBottom: 2 }}>
            New email:
          </Text>
          <Dialog.Input
            value={newEmail}
            autoCapitalize="none"
            onChangeText={value => setNewEmail(value)}
          />
          <Dialog.Button
            label="Cancel"
            onPress={() => {
              setDialogVisible(false)
            }}
          />
          <Dialog.Button
            label="Confirm"
            onPress={() => {
              let error = ""
              let newPW = "P" + Math.random().toString(36).substring(2, 10) + "!"
              console.log("NEW PASSWORD")
              console.log(newPW)
              Auth.currentAuthenticatedUser()
                .then(user => {
                  return Auth.changePassword(user, tempPW, newPW)
                })
                .catch(err => {
                  console.log(err)
                  error = err.message
                  setDialogError(err.message)
                }).then(val => {
                  if (error == "") {
                    let newProfileData = ({
                      ...profiledata,
                      restaurantInfo: {
                        ...profiledata.restaurantInfo,
                        restaurantEmail: newEmail,
                        admin: false,
                        resetPW: true,
                      },
                    })
                    updateDynamoRestaurant(id, newProfileData, true, newPW, newEmail)
                  }
                });
            }}
          />
        </Dialog.Container>
      </View>
    </ScrollView>
  );
}

function ResetPassword({ navigation, route }) {
  const [email, setemail] = useState("")
  const [error, seterror] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [data, setdata] = useState({
    password: "",
    code: ""
  })

  const send = () => {
    Auth.forgotPassword(email).then(res => {
      setConfirmed(true)
      setdata({ password: "", code: "" })
    }).catch(err => seterror(err.message))
  }

  const submit = () => {
    Alert.alert(
      '',
      'Are you sure you want to reset your password?',
      [
        {
          text: 'Cancel', onPress: () => {
            console.log('Cancel Pressed')
          }, style: 'cancel'
        },
        {
          text: "OK",
          onPress: async (txt) => {
            if (!txt || txt == "") {
              Alert.alert("Confirmation was failed. Please input correct confirmation code.");
            } else {
              let result = await Auth.verifyCurrentUserAttributeSubmit("email", txt);
              console.log("⚠️ Profile.js", result);

              if (result == "SUCCESS") {
                Alert.alert("Your email has successfully been updated.");
              } else {
                Alert.alert("Confirmation was failed. Please input correct confirmation code.");
              }
            }
          }
        }
      ],
      { cancelable: false }
    );

  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text h4 h4Style={{ fontSize: RFValue(18, 580) }}>Reset Your Password</Text>
        <View style={{ marginTop: 15 }}>
          {
            error != "" && (
              <Text style={{ color: '#D65344', textAlign: 'center', marginBottom: 15 }}>{error}</Text>
            )
          }
          {
            !confirmed ? (
              <>
                <Input label="Username *" value={email} autoCapitalize="none" inputStyle={styles.inputStyle} inputContainerStyle={{ borderBottomWidth: 0 }} style={{ marginTop: 15 }} labelStyle={{ color: 'black', fontWeight: 'normal' }} onChangeText={value => setemail(value)}></Input>
                <Button buttonStyle={styles.buttonStyle} disabled={email === ""} title="Send" disabledStyle={[styles.buttonStyle, { opacity: 0.8 }]} onPress={send}></Button>
              </>
            ) : (
              <>
                <Input label="Confirmation Code *" value={data.code} autoCapitalize="none" inputStyle={styles.inputStyle} inputContainerStyle={{ borderBottomWidth: 0 }} style={{ marginTop: 15 }} labelStyle={{ color: 'black', fontWeight: 'normal' }} onChangeText={value => setdata({ ...data, code: value })}></Input>
                <Input label="New Password *" value={data.password} autoCapitalize="none" inputStyle={styles.inputStyle} inputContainerStyle={{ borderBottomWidth: 0 }} style={{ marginTop: 15 }} labelStyle={{ color: 'black', fontWeight: 'normal' }} onChangeText={value => setdata({ ...data, password: value })}></Input>
                <Button buttonStyle={styles.buttonStyle} disabled={data.password === "" || data.code === ""} title="Submit" disabledStyle={[styles.buttonStyle, { opacity: 0.8 }]} onPress={submit}></Button>
              </>
            )
          }
          <View>
            <TouchableOpacity style={{ justifyContent: 'center', alignItems: 'center', marginTop: 25 }} onPress={
              () => navigation.goBack()
            }>
              <Text style={{ color: '#AAAA00', fontSize: RFValue(12, 580) }}> Cancel</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  // ... ResetPassword
  container: {
    flex: 1,
    width: wp('100'),
    height: hp('100'),
    padding: 24,
  },
  inputStyle: {
    flex: 1, marginTop: 5, borderRadius: 5, borderColor: '#888', borderWidth: 1, paddingLeft: 15
  },
  titles: {
    textAlign: 'center',
    color: '#D65344',
    fontWeight: 'bold',
    marginBottom: 10
  },
  signOutButton: {
    paddingTop: 15,
    marginLeft: 15,
    marginRight: 15,
    marginBottom: 15
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
  buttoncontainer: {
    padding: 15,
    paddingBottom: 0,
  },
  buttonStyle: {
    backgroundColor: '#D65344',
    paddingTop: 15,
    paddingBottom: 15,
    borderRadius: 5,
  },
  picture: {
    width: wp('30'),
    height: wp('30'),
    borderRadius: 15,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
});