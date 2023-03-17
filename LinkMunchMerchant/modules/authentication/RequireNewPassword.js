import React from 'react'
import { Text, Input, Button } from 'react-native-elements'
import { View, StyleSheet } from 'react-native'
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen'
import { RFValue } from 'react-native-responsive-fontsize'
import { Auth } from 'aws-amplify';
import Restaurant from '../restaurant/Restaurant';
import { updateDynamoRestaurant } from '../restaurant/components/subcomponents/ProfileEditor/updateDynamoRest';
import TermsAndPayment from './TermsAndPayment'


export default class RequireNewPassword extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            id: props.id,
            name: props.name,
            menu: props.menu,
            menuCategories: props.menuCategories,
            data: props.data,
            orders: props.orders,
            promos: props.promos,
            resetPW: props.resetPW,
            activeSubscription: props.activeSubscription,
            acceptedTerms: props.acceptedTerms,
            password: "",
            confirmPassword: "",
            error: "",
            tempPassword: "",
        };
        data = this.state.data;
        orders = this.state.orders;
        menu = this.state.menu;
        promos = this.state.promos;
        menuCategories = this.state.menuCategories
    }

    submitNewPW = () => {
        if (this.state.password != this.state.confirmPassword) {
            this.setState({ error: "Password fields much match." })
            return;
        } else if (this.state.password == "" || this.state.confirmPassword == "") {
            this.setState({ error: "Please enter a new password." })
            return;
        } else if (this.state.tempPassword == "") {
            this.setState({ error: "Please enter your temporary password." })
            return;
        } else {
            this.setState({ error: "" })
            Auth.currentAuthenticatedUser()
                .then(user => {
                    return Auth.changePassword(user, this.state.tempPassword, this.state.password);
                })
                .catch(err => {
                    console.log(err)
                    this.setState({ error: err.message })
                }).then(val => {
                    if (this.state.error == "") {
                        let profiledata = this.state.data
                        let newProfileData = {
                            ...profiledata,
                            resetPW: false,
                        }
                        
                        updateDynamoRestaurant(this.state.id, newProfileData)
                        this.setState({ resetPW: false })
                    }
                });
        }
    }

    render() {
        return (
            this.state.resetPW ?
                (<View style={style.container}>
                    <Text h4 h4Style={{ fontSize: RFValue(18, 580) }}>Reset Your Password</Text>
                    <View
                        key={this.state.error}
                        style={{ marginTop: 15 }}
                    >
                        {
                            this.state.error != "" && (
                                <Text style={{ color: '#D65344', textAlign: 'center', marginBottom: 15 }}>{this.state.error}</Text>
                            )
                        }
                        <>
                            <Input
                                label="Temp Password *"
                                value={this.state.tempPassword}
                                secureTextEntry={true}
                                autoCapitalize="none"
                                inputStyle={style.inputStyle}
                                inputContainerStyle={{ borderBottomWidth: 0 }}
                                style={{ marginTop: 15 }}
                                labelStyle={{ color: 'black', fontWeight: 'normal' }}
                                onChangeText={value => this.setState({ tempPassword: value })}
                            />
                            <Input
                                label="New Password *"
                                value={this.state.password}
                                secureTextEntry={true}
                                autoCapitalize="none"
                                inputStyle={style.inputStyle}
                                inputContainerStyle={{ borderBottomWidth: 0 }}
                                style={{ marginTop: 15 }}
                                labelStyle={{ color: 'black', fontWeight: 'normal' }}
                                onChangeText={value => this.setState({ password: value })}
                            />
                            <Input
                                label="Confirm Password *"
                                value={this.state.confirmPassword}
                                secureTextEntry={true}
                                autoCapitalize="none"
                                inputStyle={style.inputStyle}
                                inputContainerStyle={{ borderBottomWidth: 0 }}
                                style={{ marginTop: 15 }}
                                labelStyle={{ color: 'black', fontWeight: 'normal' }}
                                onChangeText={value => this.setState({ confirmPassword: value })}
                            />
                            <Button
                                buttonStyle={style.buttonStyle}
                                disabled={this.state.password === "" || this.state.confirmPassword === "" || this.state.tempPassword === ""}
                                title="Submit"
                                disabledStyle={[style.buttonStyle, { opacity: 0.8 }]}
                                onPress={this.submitNewPW}>
                            </Button>
                        </>
                    </View>
                </View>) : (
                            <TermsAndPayment
                                id={this.state.id}
                                name={this.state.name}
                                menu={this.state.menu}
                                menuCategories={this.state.menuCategories}
                                data={this.state.data}
                                orders={this.state.orders}
                                promos={this.state.promos}
                                activeSubscription={this.state.activeSubscription}
                                acceptedTerms={this.state.acceptedTerms}
                            />
                        )
                )
    }
}

const style = StyleSheet.create({
    container: {
        flex: 1,
        width: wp('100'),
        height: hp('100'),
        padding: 24,
        marginTop: '15%'
    },
    inputStyle: {
        flex: 1, marginTop: 5, borderRadius: 5, borderColor: '#888', borderWidth: 1, paddingLeft: 15
    },
    buttonStyle: {
        backgroundColor: '#D65344',
        paddingTop: 15,
        paddingBottom: 15,
        marginTop: 30,
    }
})