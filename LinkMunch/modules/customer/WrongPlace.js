import React from 'react';
import {
    ScrollView,
    View,
    StyleSheet,
} from 'react-native';
import { Text, Button } from 'react-native-elements';
import {
    widthPercentageToDP as wp,
    heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { RFValue } from 'react-native-responsive-fontsize';
import { Auth } from 'aws-amplify';


export default class WrongPlace extends React.Component {
    constructor(props) {
        super(props);
        Auth.currentUserInfo();
        this.state = {
            signedIn: false,
            name: '',
        };
    }

    render() {
        return (
            <View style={{ alignItems: 'center', flexDirection: 'row', flex: 1,}}>
                <ScrollView>
                    <View>
                        <Text h3 style={[styles.titles, {paddingBottom: 0}]}>
                            Oops!
                        </Text>
                        <Text h3 style={[styles.titles, {paddingTop: 5, paddingBottom: 40}]}>
                            You're in the wrong place!
                        </Text>
                        <Text style={styles.subtitles}>
                            For merchants, please download:
                        </Text>
                        <Text style={styles.appTitle}>
                            {/* ADD LINKING AFTER APPS ARE PUBLISHED */}
                            LinkMunchMerchant
                        </Text>
                        <Button
                            style={styles.signOutButton}
                            title={'Sign Out'}
                            titleStyle={styles.titleStyle}
                            onPress={() => Auth.signOut()}
                        />
                    </View>
                </ScrollView>
            </View>
        )
    }
}

const styles = StyleSheet.create({
    titles: {
        textAlign: 'center',
        color: '#E82800',
        padding: 10,
        fontWeight: "600"
    },
    subtitles: {
        textAlign: 'center',
        fontSize: 20
    },
    appTitle: {
        fontSize: 25,
        fontWeight: "700",
        textAlign: 'center',
        paddingTop: 10,
        color: '#6D64F8'
    },
    signOutButton: {
        padding: '15%',
    },
    titleStyle: {
        fontWeight: "600"
    }
});